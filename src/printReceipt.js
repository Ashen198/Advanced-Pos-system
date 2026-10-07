// src/printReceipt.js
export function printReceipt(saleData) {
  const printWindow = window.open('', '_blank', 'width=350,height=600');
  
  const itemsHtml = saleData.items.map(item => `
    <tr>
      <td style="text-align:left;">${item.name} (${item.qty} ${item.unit})</td>
      <td style="text-align:right;">$${(item.price * item.qty).toFixed(2)}</td>
    </tr>
  `).join('');

  const receiptHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt</title>
        <style>
          body { font-family: monospace; font-size: 12px; width: 280px; margin: 0 auto; padding: 10px; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 16px;">ABCD GROCERY SUPERMARKET</div>
        <div class="center">123 Main Street, City</div>
        <div class="center">Tel: +1 234 567 890</div>
        <div class="line"></div>
        <div>Receipt #: ${saleData.receiptNo}</div>
        <div>Date: ${new Date(saleData.timestamp).toLocaleString()}</div>
        <div>Payment: ${saleData.paymentMethod.toUpperCase()}</div>
        <div class="line"></div>
        <table>
          <thead>
            <tr>
              <th style="text-align:left;">Item</th>
              <th style="text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="line"></div>
        <div style="display:flex; justify-content:space-between;" class="bold">
          <span>GRAND TOTAL:</span>
          <span>Rs.${saleData.total.toFixed(2)}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span>Paid:</span>
          <span>Rs.${parseFloat(saleData.amountPaid || saleData.total).toFixed(2)}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span>Change:</span>
          <span>Rs.${parseFloat(saleData.change || 0).toFixed(2)}</span>
        </div>
        <div class="line"></div>
        <div class="center">Thank you for shopping with us!</div>
        <div class="line"></div>
        <div class="center">--VertexStack Software 0765418707--</div>
      </body>
    </html>
  `;

  printWindow.document.write(receiptHtml);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}