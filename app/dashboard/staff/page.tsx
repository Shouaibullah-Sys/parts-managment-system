export default function StaffDashboard() {
  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto py-10">
      <h1 className="text-3xl font-bold">Staff Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Parts Management</h2>
          <p className="text-gray-600">Manage and track parts inventory</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Orders</h2>
          <p className="text-gray-600">View and process orders</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Reports</h2>
          <p className="text-gray-600">Generate inventory reports</p>
        </div>
      </div>
    </div>
  );
}
