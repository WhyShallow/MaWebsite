Book listings and order destinations are configured in `../../njz/books.js`.

Set each book's `orderUrl` to the website to open after the customer submits a
delivery address. The address and book title are sent to the configured
Discord webhook through the existing Worker before the browser opens that URL.
The address is not saved by this site. Customers are told where their address
will be sent before they submit it.