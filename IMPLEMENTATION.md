# Supply Hub - Order Management System

A modern, responsive Supply Hub application built with React, TypeScript, and Dataverse integration.

## Features

### 1. Layout & Navigation
- **Sidebar Navigation**: Two main sections
  - 📦 Catalog - Browse available items
  - 📋 My Orders - Track your orders
- **Header**: Shows "Supply Hub" title and current user's display name
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

### 2. Catalog Page (Default Landing)
- **Item Display**: Responsive card grid showing all active catalog items
- **Search & Filter Bar**:
  - Search by Item Name (real-time filtering)
  - Filter by Category dropdown:
    - Office Supplies
    - IT Equipment
    - Access & Security
    - Stationery
    - Other
- **Item Cards**: Each card displays:
  - Item name
  - Category badge
  - Availability status (Available/Unavailable)
  - Order button (disabled for unavailable items)
  
### 3. Order Modal
Opens when clicking "Order" on any available catalog item:
- **Pre-filled**: Selected catalog item (read-only)
- **Editable Fields**:
  - Quantity (default: 1, required)
  - Needed By (date picker)
  - Delivery Location (text input, max 100 chars)
  - Notes (textarea, max 100 chars)
- **On Submit**:
  - Creates new order in Dataverse
  - Sets Order Status to "Submitted"
  - Links to selected Catalog Item
  - Sets Order Date to today
  - Shows success toast notification
  - Closes modal

### 4. My Orders Page
- **Order Table**: Displays all orders for current user
- **Columns**:
  - Order ID
  - Item (from catalog lookup)
  - Quantity
  - Order Date
  - Needed By
  - Status (with color-coded badges)
  - Assigned To (owner)
- **Sorting**: Orders sorted by Order Date (descending)
- **Status Badge Colors**:
  - Submitted → Gray
  - Approved → Blue
  - In Progress → Yellow
  - Ordered → Purple
  - Delivered → Green
  - Denied → Red

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Data Source**: Microsoft Dataverse via Power Apps SDK
- **State Management**: React Hooks

## Data Sources

### Catalog Items (`kcs_catalogitems`)
- `kcs_itemname`: Item name
- `kcs_category`: Category (picklist)
- `kcs_available`: Availability (boolean)
- `statecode`: Active/Inactive

### Internal Orders (`kcs_internalorders`)
- `kcs_orderid`: Order ID
- `kcs_item`: Lookup to Catalog Items
- `kcs_quantity`: Quantity ordered
- `kcs_orderdate`: Date order was placed
- `kcs_neededby`: Required delivery date
- `kcs_deliverylocation`: Delivery address
- `kcs_notes`: Additional notes
- `kcs_orderstatus`: Status (picklist)
- `ownerid`: Assigned to user
- `createdby`: Ordered by user
- `statecode`: Active/Inactive

## Project Structure

```
src/
├── components/
│   ├── Layout.tsx           # Main layout with sidebar and header
│   ├── CatalogPage.tsx      # Catalog listing with filters
│   ├── OrderModal.tsx       # Order creation modal
│   └── MyOrdersPage.tsx     # Orders table view
├── generated/
│   ├── models/              # Auto-generated Dataverse models
│   └── services/            # Auto-generated Dataverse services
├── hooks/
│   └── useCurrentUser.ts    # Hook for current user context
├── types/
│   └── index.ts             # TypeScript interfaces and types
├── App.tsx                  # Main app component
├── App.css                  # App-specific styles
└── index.css                # Global styles with Tailwind
```

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Power Apps environment with Dataverse

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure Dataverse connection:
   - Update `power.config.json` with your environment details

3. Add data sources:
   ```bash
   npx power-apps add-data-source
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

5. Open in Power Apps:
   - Use the local play URL shown in terminal
   - Or open http://localhost:5173/ for local preview

### Build for Production

```bash
npm run build
```

## Development Notes

### User Context
Currently using a mock user. In production:
1. Replace the `useCurrentUser` hook with actual Power Apps user context
2. Update `ownerid` in OrderModal to use real user ID
3. Add user filtering in MyOrdersPage query

### Data Filtering
All queries filter for active records (`statecode eq 0`) following Dataverse best practices.

### Error Handling
- All API calls include try-catch error handling
- User-friendly error messages displayed in UI
- Retry buttons provided on error states
- Loading states shown during data fetches

## Future Enhancements

- [ ] Real user authentication and context
- [ ] Order editing functionality
- [ ] Advanced filtering (date ranges, status filters)
- [ ] Pagination for large datasets
- [ ] Export orders to Excel/PDF
- [ ] Email notifications on order status changes
- [ ] Order history and audit trail
- [ ] Bulk order creation
- [ ] Analytics dashboard

## License

Proprietary - Cogna Educational Group
