interface ItemData {
  title: string;
  publisher: string;
  subscriptionInfo: string;
  price: string;
  proratedPrice: string;
}

interface OrderData {
  date: string;
  orderId: string;
  total: string;
  items: ItemData[];
}

// Function to get the selected family member
function getFamilyMember(): string | null {
  const familyMemberSelect = document.querySelector('select[data-auto-test-id="RAP2.FilterPurchases.Select.FamilyMember"]') as HTMLSelectElement;
  if (!familyMemberSelect) return null;
  
  const selectedOption = familyMemberSelect.options[familyMemberSelect.selectedIndex];
  return selectedOption?.textContent?.trim() || null;
}

// Function to force load all data by scrolling
async function forceDataLoad(startDate?: string): Promise<void> {
  return new Promise((resolve) => {
    const dateXPath = "//span[@data-auto-test-id='RAP2.PurchaseList.PurchaseHeader.Display.Date']";
    
    // Helper function to check if we've found a date earlier than startDate
    const hasDateEarlierThanStart = (): boolean => {
      if (!startDate) return false;
      
      const dateElements = document.evaluate(dateXPath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      const lastDate = dateElements.snapshotItem(dateElements.snapshotLength - 1)?.textContent?.trim();
      
      if (lastDate) {
        const lastDateObj = new Date(lastDate);
        const startDateObj = new Date(startDate);
        return lastDateObj < startDateObj;
      }
      
      return false;
    };

    // First check if we already have dates earlier than our start date
    if (hasDateEarlierThanStart()) {
      resolve();
      return;
    }

    let lastHeight = 0;
    let attempts = 0;
    const maxAttempts = 50; // Maximum number of scroll attempts
    const scrollDelay = 500; // Delay between scrolls in milliseconds

    const scrollInterval = setInterval(() => {
      // Scroll to the bottom of the page
      window.scrollTo(0, document.documentElement.scrollHeight);
      
      // Get current height
      const currentHeight = document.documentElement.scrollHeight;
      
      // If we've reached the bottom and the height hasn't changed
      if (currentHeight === lastHeight) {
        attempts++;
        
        // If we've tried enough times or reached the maximum attempts, stop
        if (attempts >= 3 || attempts >= maxAttempts) {
          clearInterval(scrollInterval);
          // Scroll back to top
          window.scrollTo(0, 0);
          resolve();
        }
      } else {
        // Reset attempts if we found new content
        attempts = 0;

        // Check if we've loaded past our start date
        if (hasDateEarlierThanStart()) {
          clearInterval(scrollInterval);
          // Scroll back to top
          window.scrollTo(0, 0);
          resolve();
        }
      }
      
      lastHeight = currentHeight;
    }, scrollDelay);
  });
}

// Function to extract item details from a purchase list
function extractItemDetails(purchaseList: Element): ItemData[] {
  const items: ItemData[] = [];
  
  // Get all list items
  const listItems = purchaseList.querySelectorAll('li.pli');
  
  listItems.forEach(item => {
    const itemDetails: ItemData = {
      title: '',
      publisher: '',
      subscriptionInfo: '',
      price: '',
      proratedPrice: ''
    };
    
    // Get title
    const title = item.querySelector('.pli-title div')?.textContent?.trim();
    if (title) itemDetails.title = title;
    
    // Get publisher
    const publisher = item.querySelector('.pli-publisher')?.textContent?.trim();
    if (publisher) itemDetails.publisher = publisher;
    
    // Get subscription info
    const subscriptionInfo = item.querySelector('.pli-subscription-info')?.textContent?.trim();
    if (subscriptionInfo) itemDetails.subscriptionInfo = subscriptionInfo;
    
    // Get price
    const price = parseCurrency(item.querySelector('.pli-price span')?.textContent?.trim()?.replace('$', '') || '');
    if (price) itemDetails.price = price;

    // Join all details with semicolon
    items.push(itemDetails);
  });
  
  return items;
}

// Function to safely parse currency values
function parseCurrency(value: string): string {
  const numericValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
  return isNaN(numericValue) ? '0.00' : numericValue.toFixed(2);
}

function parseOrderData(startDate?: string, endDate?: string): OrderData[] {
  const orders: OrderData[] = [];
  
  // XPath selectors for the data using data-auto-test-id attributes
  const dateXPath = "//span[@data-auto-test-id='RAP2.PurchaseList.PurchaseHeader.Display.Date']";
  const orderIdXPath = "//span[@data-auto-test-id='RAP2.PurchaseList.PurchaseHeader.Display.WebOrder']";
  const totalXPath = "//span[@data-auto-test-id='RAP2.PurchaseList.Display.Invoice.Amount']";
  const purchaseListXPath = "//ul[@class='pli-list applicable-items']";

  try {
    // Get all matching elements
    const dateElements = document.evaluate(dateXPath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    const orderIdElements = document.evaluate(orderIdXPath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    const totalElements = document.evaluate(totalXPath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    const purchaseListElements = document.evaluate(purchaseListXPath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

    // Extract data from each order
    for (let i = 0; i < dateElements.snapshotLength; i++) {
      const date = dateElements.snapshotItem(i)?.textContent?.trim() || '';
      const orderId = orderIdElements.snapshotItem(i)?.textContent?.trim() || '';
      const total = parseCurrency(totalElements.snapshotItem(i)?.textContent?.trim().replace('$', '') || '');
      const purchaseList = purchaseListElements.snapshotItem(i) as Element;
      const items = purchaseList ? extractItemDetails(purchaseList) : [];

      if (date && orderId && total) {
        // Convert the date string to a Date object for comparison
        const orderDate = new Date(date);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        // Only add the order if it falls within the date range (if specified)
        if ((!start || orderDate >= start) && (!end || orderDate <= end)) {
          orders.push({ date, orderId, total, items });
        }
      }
    }
  } catch (error) {
    console.error('Error parsing order data:', error);
  }

  return orders;
}

function allocatePriceWithTax(itemPrices: number[], totalWithTax: number): number[] {
  const subtotal = itemPrices.reduce((sum, price) => sum + price, 0);
  const totalTax = +(totalWithTax - subtotal).toFixed(2);

  // Step 1: Compute unrounded taxes
  const unroundedTaxes = itemPrices.map(price => price > 0 ? (price / subtotal) * totalTax : 0);

  // Step 2: Round taxes down, track error
  const roundedTaxes = unroundedTaxes.map(tax => Math.floor(tax * 100) / 100);
  let roundingDifference = +(totalTax - roundedTaxes.reduce((sum, tax) => sum + tax, 0)).toFixed(2);

  // Step 3: Distribute leftover cents to items with highest tax remainder
  const remainders = unroundedTaxes.map((tax, i) => ({
    index: i,
    remainder: tax - roundedTaxes[i]
  }));

  remainders.sort((a, b) => b.remainder - a.remainder);

  let i = 0;
  while (roundingDifference >= 0.01 - 1e-10) {
    const idx = remainders[i % remainders.length].index;
    roundedTaxes[idx] = +(roundedTaxes[idx] + 0.01).toFixed(2);
    roundingDifference = +(roundingDifference - 0.01).toFixed(2);
    i++;
  }

  // Step 4: Return price + tax per item
  return itemPrices.map((price, i) => +(price + roundedTaxes[i]).toFixed(2));
}

// Function to calculate prorated prices for each item
function calculateProratedPrice(orders: OrderData[]): OrderData[] {
  return orders.map(order => {
    const itemPrices = order.items.map(item => parseFloat(item.price));
    const totalWithTax = parseFloat(order.total);
    const proratedItemPrices = allocatePriceWithTax(itemPrices, totalWithTax);
    return {
      ...order,
      items: order.items.map((item, index) => ({
        ...item,
        proratedPrice: proratedItemPrices[index].toFixed(2)
      }))
    };
  });
}

// Initialize message listener
console.log('Content script initialized');
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === 'parseOrders') {
    (async () => {
      try {
        // First force load all data
        await forceDataLoad(request.startDate);
        
        // Then parse the orders
        const parseOrders = parseOrderData(request.startDate, request.endDate);
        const orders = calculateProratedPrice(parseOrders);
        const familyMember = getFamilyMember();
        console.log('Parsed orders:', orders);
        sendResponse({ orders, familyMember });
      } catch (error) {
        console.error('Error processing parseOrders request:', error);
        sendResponse({ error: 'Failed to parse orders' });
      }
    })();
    return true; // Keep the message channel open for async response
  }
}); 