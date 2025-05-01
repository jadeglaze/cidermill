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

// Function to check if we're on the Apple Report page
function checkAppleReportPage(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      resolve(tab?.url?.includes('reportaproblem.apple.com') || false);
    });
  });
}

// Function to update the UI
function updateStatus(isOnApplePage: boolean) {
  const statusElement = document.getElementById('status');
  const dataLevel = document.querySelector('.data-level');
  const dateRangeContainer = document.querySelector('.date-range-container');
  const customDateRange = document.getElementById('customDateRange');
  const dataTableContainer = document.getElementById('dataTableContainer');
  const downloadContainer = document.getElementById('downloadContainer');
  
  if (!statusElement) return;

  if (isOnApplePage) {
    statusElement.textContent = 'You are on the correct page. Ready to extract!';
    statusElement.className = 'status on-site';
    // Show all controls
    if (dataLevel) (dataLevel as HTMLElement).style.display = 'block';
    if (dateRangeContainer) (dateRangeContainer as HTMLElement).style.display = 'flex';
    if (customDateRange) customDateRange.style.display = 'none';
    if (dataTableContainer) dataTableContainer.style.display = 'none';
    if (downloadContainer) downloadContainer.style.display = 'none';
  } else {
    statusElement.innerHTML = 'You are not on the correct page. <a href="https://reportaproblem.apple.com" target="_blank">Go to purchase history page</a>';
    statusElement.className = 'status off-site';
    // Hide all controls
    if (dataLevel) (dataLevel as HTMLElement).style.display = 'none';
    if (dateRangeContainer) (dateRangeContainer as HTMLElement).style.display = 'none';
    if (customDateRange) customDateRange.style.display = 'none';
    if (dataTableContainer) dataTableContainer.style.display = 'none';
    if (downloadContainer) downloadContainer.style.display = 'none';
  }
}

// Function to validate date range
function validateDateRange(startDate: string, endDate: string): boolean {
  if (!startDate || !endDate) return false;
  return new Date(startDate) <= new Date(endDate);
}

// Function to update the apply button state
function updateApplyButton() {
  const startDate = (document.getElementById('startDate') as HTMLInputElement).value;
  const endDate = (document.getElementById('endDate') as HTMLInputElement).value;
  const applyButton = document.getElementById('applyDateRange') as HTMLButtonElement;
  
  if (applyButton) {
    applyButton.disabled = !validateDateRange(startDate, endDate);
  }
}

function setLoading(isLoading: boolean) {
  const applyButton = document.getElementById('applyDateRange') as HTMLButtonElement;
  if (applyButton) {
    if (isLoading) {
      applyButton.classList.add('loading');
      applyButton.disabled = true;
    } else {
      applyButton.classList.remove('loading');
      updateApplyButton();
    }
  }
}

function generateCSV(orders: OrderData[], dataLevel: string): string {
  const headers = dataLevel === 'Orders' ? 
    ['Order ID', 'Date', 'Total', 'Items'] :
    ['Order ID', 'Date', 'Total', 'Title', 'Publisher', 'Subscription Info', 'Price', 'Price with Tax'];
  const rows = dataLevel === 'Orders' ? 
    orders.map(order => {
      const isoDate = new Date(order.date).toISOString().split('T')[0];
      // Escape any quotes in the items and wrap in quotes to handle newlines
      const escapedItems = concatenateItems(order.items, '\n').replace(/"/g, '""');
      return [order.orderId, isoDate, order.total, `"${escapedItems}"`];
    }) :
    orders.flatMap(order => {
      const isoDate = new Date(order.date).toISOString().split('T')[0];
      
      // For Items level, create a row for each item in the order
      return order.items.map(item => [
        order.orderId,
        isoDate,
        order.total,
        `"${item.title.replace(/"/g, '""')}"`,
        `"${item.publisher.replace(/"/g, '""')}"`,
        `"${item.subscriptionInfo.replace(/"/g, '""')}"`,
        item.price,
        item.proratedPrice
      ]);
    });
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function concatenateItems(items: ItemData[], separator: string) {
  return items.map(item => {
    const fields = [
      item.title,
      item.publisher,
      item.subscriptionInfo,
      item.price,
      item.proratedPrice
    ].filter(field => field && field.trim() !== '');
    return fields.join('; ');
  }).join(separator);
}

// Function to create and download CSV file
function downloadCSV(orders: OrderData[], dataLevel: string, startDate: string, endDate: string, familyMember?: string) {
  const csvContent = generateCSV(orders, dataLevel);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  // Create filename based on family member presence
  const filename = familyMember
    ? `Apple_Purchases_${familyMember}_${dataLevel}_${startDate}_${endDate}.csv`
    : `Apple_Purchases_${dataLevel}_${startDate}_${endDate}.csv`;
  
  const downloadLink = document.getElementById('downloadLink') as HTMLAnchorElement;
  if (downloadLink) {
    downloadLink.href = url;
    downloadLink.download = filename;
    downloadLink.style.display = 'inline';
  }
}

// Function to display order data in the table
function displayOrderData(orders: OrderData[], dataLevel: string, startDate: string, endDate: string, familyMember?: string) {
  const tableBody = document.getElementById('dataTableBody');
  const tableContainer = document.getElementById('dataTableContainer');
  const downloadContainer = document.getElementById('downloadContainer');
  const rowCount = document.getElementById('rowCount');
  const orderHeaders = document.getElementById('orderHeaders');
  const itemHeaders = document.getElementById('itemHeaders');
  
  if (!tableBody || !tableContainer || !downloadContainer || !rowCount || !orderHeaders || !itemHeaders) return;

  // Show/hide appropriate headers
  if (dataLevel === 'Orders') {
    orderHeaders.style.display = 'table-header-group';
    itemHeaders.style.display = 'none';
  } else {
    orderHeaders.style.display = 'none';
    itemHeaders.style.display = 'table-header-group';
  }

  // Clear existing rows
  tableBody.innerHTML = '';

  if (orders.length === 0) {
    const colspan = dataLevel === 'Orders' ? 4 : 8;
    tableBody.innerHTML = `<tr><td colspan="${colspan}" class="no-data">No orders found in the selected date range</td></tr>`;
    downloadContainer.style.display = 'none';
  } else {
    if (dataLevel === 'Orders') {
      // Add each order as a row
      orders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${order.orderId}</td>
          <td>${order.date}</td>
          <td>${order.total}</td>
          <td>${concatenateItems(order.items, '<br>')}</td>
        `;
        tableBody.appendChild(row);
      });
      rowCount.textContent = `${orders.length} orders`;
    } else {
      // Add each item as a separate row with order details repeated
      let itemCount = 0;
      orders.forEach(order => {
        // Create a row for each item in the order
        order.items.forEach(item => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${order.orderId}</td>
            <td>${order.date}</td>
            <td>${order.total}</td>
            <td>${item.title}</td>
            <td>${item.publisher}</td>
            <td>${item.subscriptionInfo}</td>
            <td>${item.price}</td>
            <td>${item.proratedPrice}</td>
          `;
          tableBody.appendChild(row);
          itemCount++;
        });
      });
      rowCount.textContent = `${itemCount} items`;
    }
    // Show the table and download link
    tableContainer.style.display = 'block';
    downloadContainer.style.display = 'flex';
    
    // Create and setup download link
    downloadCSV(orders, dataLevel, startDate, endDate, familyMember);
  }
}

// Function to handle date range extraction
async function handleExtract() {
  const orderLevelElement = document.getElementById('orderLevel') as HTMLInputElement;
  const itemLevelElement = document.getElementById('itemLevel') as HTMLInputElement;
  const dataLevel = orderLevelElement.checked ? orderLevelElement.value : itemLevelElement.value;
  const startDate = (document.getElementById('startDate') as HTMLInputElement).value;
  const endDate = (document.getElementById('endDate') as HTMLInputElement).value;
  
  if (!validateDateRange(startDate, endDate)) {
    return;
  }

  setLoading(true);
  
  try {
    // Get the current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.id) {
      throw new Error('No active tab found');
    }

    // Ensure we're on the correct page
    if (!tab.url?.includes('reportaproblem.apple.com')) {
      throw new Error('Not on Apple Report a Problem page');
    }

    // Try to inject the content script if it's not already loaded
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
    } catch (error) {
      // If the script is already injected, this will throw an error
      // We can ignore this error as it means the script is already loaded
      console.log('Script may already be injected:', error);
    }

    // Update loading message
    const tableBody = document.getElementById('dataTableBody');
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="3" class="no-data">
            Loading purchase history... This may take a moment.
          </td>
        </tr>
      `;
    }

    // Send message to content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'parseOrders',
      startDate,
      endDate
    });

    if (response?.error) {
      throw new Error(response.error);
    }

    if (response?.orders) {
      displayOrderData(response.orders, dataLevel, startDate, endDate, response.familyMember);
    } else {
      throw new Error('No orders found');
    }
  } catch (error) {
    console.error('Error:', error);
    const tableBody = document.getElementById('dataTableBody');
    const downloadContainer = document.getElementById('downloadContainer');
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="3" class="no-data">
            Error: ${error instanceof Error ? error.message : 'Failed to extract orders'}
          </td>
        </tr>
      `;
    }
    if (downloadContainer) {
      downloadContainer.style.display = 'none';
    }
  } finally {
    setLoading(false);
  }
}

// Function to get date range based on selection
function getDateRange(range: string): { startDate: string; endDate: string } {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
  
  switch (range) {
    case 'monthToDate':
      return {
        startDate: firstDayOfMonth.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      };
    
    case 'lastMonth':
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        startDate: lastMonth.toISOString().split('T')[0],
        endDate: lastMonthEnd.toISOString().split('T')[0]
      };
    
    case 'yearToDate':
      return {
        startDate: firstDayOfYear.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      };
    
    case 'lastYear':
      const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
      const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
      return {
        startDate: lastYearStart.toISOString().split('T')[0],
        endDate: lastYearEnd.toISOString().split('T')[0]
      };
    
    default:
      return {
        startDate: '',
        endDate: ''
      };
  }
}

// Function to handle date range selection
function handleDateRangeChange() {
  const dateRangeSelect = document.getElementById('dateRange') as HTMLSelectElement;
  const customDateRange = document.getElementById('customDateRange') as HTMLDivElement;
  const startDateInput = document.getElementById('startDate') as HTMLInputElement;
  const endDateInput = document.getElementById('endDate') as HTMLInputElement;
  
  if (!dateRangeSelect || !customDateRange || !startDateInput || !endDateInput) return;
  
  const selectedRange = dateRangeSelect.value;
  
  if (selectedRange === 'custom') {
    customDateRange.style.display = 'block';
    // Enable the button if dates are already set
    updateApplyButton();
  } else {
    customDateRange.style.display = 'none';
    const { startDate, endDate } = getDateRange(selectedRange);
    startDateInput.value = startDate;
    endDateInput.value = endDate;
    // Enable the button since we have valid dates
    const applyButton = document.getElementById('applyDateRange') as HTMLButtonElement;
    if (applyButton) {
      applyButton.disabled = false;
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check if we're on the Apple Report page
  checkAppleReportPage().then(updateStatus);

  // Set up date range event listeners
  const startDateInput = document.getElementById('startDate') as HTMLInputElement;
  const endDateInput = document.getElementById('endDate') as HTMLInputElement;
  const dateRangeSelect = document.getElementById('dateRange') as HTMLSelectElement;
  const applyButton = document.getElementById('applyDateRange');

  if (startDateInput && endDateInput && dateRangeSelect && applyButton) {
    // Set default date range to Month to Date
    const { startDate, endDate } = getDateRange('monthToDate');
    startDateInput.value = startDate;
    endDateInput.value = endDate;
    
    // Add event listeners
    dateRangeSelect.addEventListener('change', handleDateRangeChange);
    startDateInput.addEventListener('change', updateApplyButton);
    endDateInput.addEventListener('change', updateApplyButton);
    applyButton.addEventListener('click', handleExtract);

    // Initial button state
    updateApplyButton();
  }
}); 