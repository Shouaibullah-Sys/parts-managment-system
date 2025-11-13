export default function AdminDashboard() {
  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto py-10">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">User Management</h2>
          <p className="text-gray-600">Manage users and permissions</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Organization Settings</h2>
          <p className="text-gray-600">Configure organization settings</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">System Analytics</h2>
          <p className="text-gray-600">
            View system-wide analytics and reports
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Parts Inventory</h2>
          <p className="text-gray-600">Full access to parts management</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Order Management</h2>
          <p className="text-gray-600">Oversee all orders and transactions</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Advanced Reports</h2>
          <p className="text-gray-600">
            Generate comprehensive business reports
          </p>
        </div>
      </div>
    </div>
  );
}
