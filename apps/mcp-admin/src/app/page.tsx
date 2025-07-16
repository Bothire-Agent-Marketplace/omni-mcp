import { 
  UserButton, 
  OrganizationSwitcher, 
  CreateOrganization,
  OrganizationProfile 
} from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId, orgId } = await auth();

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                MCP Admin Dashboard
              </h1>
              <OrganizationSwitcher
                afterCreateOrganizationUrl="/dashboard"
                afterLeaveOrganizationUrl="/"
                afterSelectOrganizationUrl="/dashboard"
                createOrganizationMode="modal"
                appearance={{
                  elements: {
                    rootBox: "flex items-center"
                  }
                }}
              />
            </div>
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8"
                }
              }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!orgId ? (
          /* No organization selected - show create organization */
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Create or Join an Organization
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                You need to be part of an organization to access MCP services.
              </p>
              <CreateOrganization 
                afterCreateOrganizationUrl="/dashboard"
                appearance={{
                  elements: {
                    rootBox: "w-full"
                  }
                }}
              />
            </div>
          </div>
        ) : (
          /* Organization selected - show dashboard */
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Organization Dashboard
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">
                    Quick Stats
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">
                      User ID: <span className="font-mono text-xs">{userId}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Organization ID: <span className="font-mono text-xs">{orgId}</span>
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">
                    Available MCP Services
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium text-green-800">Linear Integration</span>
                      <span className="text-xs text-green-600">Active</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium text-green-800">Perplexity AI</span>
                      <span className="text-xs text-green-600">Active</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium text-green-800">Development Tools</span>
                      <span className="text-xs text-green-600">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Organization Profile Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Organization Settings
              </h2>
              <OrganizationProfile 
                routing="hash"
                appearance={{
                  elements: {
                    rootBox: "w-full"
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
