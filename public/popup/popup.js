document.addEventListener('DOMContentLoaded', () => {
  // Centralize DOM element lookups for better organization and performance.
  const elements = {
    loginButton: document.getElementById('loginButton'),
    logoutButton: document.getElementById('logoutButton'),
    payButton: document.getElementById('payButton'),
    authSection: document.getElementById('auth-section'),
    userSection: document.getElementById('user-section'),
    paymentSection: document.getElementById('payment-section'),
    separator: document.getElementById('separator'),
    userEmailSpan: document.getElementById('userEmail'),
    merchantNameSpan: document.getElementById('merchantName'),
    paymentAmountSpan: document.getElementById('paymentAmount'),
    paymentCurrencySpan: document.getElementById('paymentCurrency'),
    statusMessage: document.getElementById('statusMessage')
  };

  // Placeholder for current transaction details
  let currentTransaction = null;

  // Function to update UI based on authentication status
  function updateUI(token) {
    if (token) {
      // User is authenticated
      elements.authSection.style.display = 'none';
      elements.userSection.style.display = 'block';
      elements.separator.style.display = 'block';
      // Decode JWT to get user info (for display only, don't trust for security)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        elements.userEmailSpan.textContent = payload.email || 'user';
      } catch (e) {
        elements.userEmailSpan.textContent = 'user';
        console.warn("Could not decode JWT for display purposes. This is normal if the token is not a JWT.", e);
      }
      // Show payment section if there's a transaction ready
      elements.paymentSection.style.display = currentTransaction ? 'block' : 'none';
      // The pay button should only be enabled if the user is logged in AND there is a transaction.
      elements.payButton.disabled = !currentTransaction;
    } else {
      // User is not authenticated
      elements.authSection.style.display = 'block';
      elements.userSection.style.display = 'none';
      elements.paymentSection.style.display = 'none';
      elements.separator.style.display = 'none';
      elements.payButton.disabled = true; // Always disable if not logged in.
    }
  }

  // Handle login button click
  elements.loginButton.addEventListener('click', async () => {
    elements.loginButton.disabled = true;
    elements.statusMessage.textContent = 'Attempting to log in...';
    try {
      const response = await chrome.runtime.sendMessage({ action: "initiateLogin" });
      if (response && response.status === 'success') {
        elements.statusMessage.textContent = 'Login successful!';
        updateUI(response.token);
      } else {
        throw new Error(response?.error || 'Unknown login error');
      }
    } catch (error) {
      elements.statusMessage.textContent = `Login failed: ${error.message}`;
      console.error("Login failed:", error);
      updateUI(null);
    } finally {
      elements.loginButton.disabled = false;
    }
  });

  // Handle logout button click
  elements.logoutButton.addEventListener('click', async () => {
    elements.logoutButton.disabled = true;
    elements.statusMessage.textContent = 'Logging out...';
    try {
      const response = await chrome.runtime.sendMessage({ action: "initiateLogout" });
      if (response && response.status === 'success') {
        elements.statusMessage.textContent = 'You have been logged out.';
        updateUI(null);
      } else {
        throw new Error(response?.error || 'Unknown logout error');
      }
    } catch (error) {
      elements.statusMessage.textContent = `Logout failed: ${error.message}`;
      console.error("Logout failed:", error);
    } finally {
      elements.logoutButton.disabled = false;
    }
  });

  // Handle pay button click
  elements.payButton.addEventListener('click', async () => {
    if (!currentTransaction) {
      elements.statusMessage.textContent = 'No payment details available.';
      return;
    }

    elements.payButton.disabled = true;
    elements.statusMessage.textContent = 'Initiating payment... Please wait.';
    try {
      // Send payment initiation request to background script
      const response = await chrome.runtime.sendMessage({
        action: "initiatePayment",
        data: currentTransaction
      });
      console.log("Response from background script (initiation):", response);
      if (response.status === 'pending_sca' || response.status === 'pending') {
        elements.statusMessage.textContent = response.message || 'Awaiting final status...';
        // Do not re-enable pay button; wait for a final status update.
      } else {
        throw new Error(response.error || 'Payment initiation failed.');
      }
    } catch (error) {
      console.error("Payment initiation failed:", error);
      elements.statusMessage.textContent = `Payment failed: ${error.message}`;
      elements.payButton.disabled = false; // Re-enable if initiation itself failed.
    }
  });

  // Listen for messages from content scripts (e.g., checkout details)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "checkoutDetected") {      
      // Defensive validation: Ensure data from content script is well-formed before use.
      if (!message.data || typeof message.data.amount !== 'number' || !message.data.currency || !message.data.merchantName) {
        console.error("Invalid or incomplete checkout data received from content script:", message.data);
        elements.statusMessage.textContent = 'Error reading payment details from page.';
        currentTransaction = null;
        updateUI(); // Refresh UI to hide payment section
        sendResponse({ status: "error", message: "Invalid checkout data." });
        return; // Stop processing
      }

      currentTransaction = message.data;
      elements.merchantNameSpan.textContent = currentTransaction.merchantName;
      elements.paymentAmountSpan.textContent = currentTransaction.amount.toFixed(2);
      elements.paymentCurrencySpan.textContent = currentTransaction.currency;
      elements.statusMessage.textContent = 'Payment details ready for confirmation.';
      
      // Re-run updateUI to correctly show the payment section if the user is already logged in.
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        updateUI(token);
      });

      console.log("Received checkout details in popup:", currentTransaction);
      sendResponse({ status: "success", message: "Popup updated with checkout details." });
    } else if (message.action === "paymentStatusUpdate") {
      const { transactionId, status, message: statusMsg, error } = message.data;
      console.log(`Payment Update for ${transactionId}: Status - ${status}`);
      elements.statusMessage.textContent = `Payment status: ${statusMsg || status}`;

      if (status === 'AUTHORIZED' || status === 'COMPLETED') {
        elements.payButton.disabled = true;
        elements.paymentSection.style.display = 'none';
        currentTransaction = null; // Clear completed transaction
      } else if (status === 'FAILED' || status === 'DECLINED') {
        elements.statusMessage.textContent = `Payment failed: ${statusMsg || error || 'Please try again.'}`;
        elements.payButton.disabled = false; // Re-enable for retry
      }
      sendResponse({ status: "acknowledged" });
    }
    return true; // Keep the message channel open for async response
  });

  // Initial UI check on popup open
  // This non-interactive call checks for a cached token without prompting the user.
  // It's a quick and silent way to determine the initial logged-in state.
  chrome.identity.getAuthToken({ interactive: false }, (token) => {
    updateUI(token);
  });
});