# Next.js App Router Best Practices

> **Component Architecture and Data Fetching Guidelines for Next.js 15+ App Router**

## Table of Contents

- [Overview](#overview)
- [Component Architecture](#component-architecture)
- [Page vs View Component Separation](#page-vs-view-component-separation)
- [Data Fetching Patterns](#data-fetching-patterns)
- [Server vs Client Components](#server-vs-client-components)
- [Project Structure Guidelines](#project-structure-guidelines)
- [Common Patterns](#common-patterns)
- [Performance Best Practices](#performance-best-practices)
- [Migration Guidelines](#migration-guidelines)

## Overview

Next.js 15's App Router fundamentally changes how we structure applications by embracing **React
Server Components (RSC)** by default. This enables:

- **Server-first rendering** with reduced client-side JavaScript
- **Direct data fetching** in components without waterfalls
- **Automatic code splitting** at the component level
- **Improved SEO and performance** through static generation

The key principle: **Pages handle data, Views handle presentation**.

## Component Architecture

### The Separation Pattern

```
app/
├── page.tsx          # Page Component (Server, Data Fetching)
├── loading.tsx       # Loading UI (Server)
├── error.tsx         # Error UI (Client)
└── components/
    ├── PageView.tsx  # View Component (Presentation)
    └── InteractiveButton.tsx  # Client Component (Interactivity)
```

### MVC-Inspired Architecture

```typescript
// Model: Data fetching in Server Components
async function fetchUserData(id: string) {
  const user = await db.user.findUnique({ where: { id } });
  return user;
}

// Controller: Page component orchestrates data and view
export default async function UserPage({ params }: { params: { id: string } }) {
  const user = await fetchUserData(params.id); // Server-side data fetching
  return <UserView user={user} />; // Pass data to view
}

// View: Presentational component
function UserView({ user }: { user: User }) {
  return (
    <div>
      <h1>{user.name}</h1>
      <UserActions userId={user.id} /> {/* Client component for interactivity */}
    </div>
  );
}
```

## Page vs View Component Separation

### Page Components (`page.tsx`)

**Purpose**: Route-level data fetching and server-side logic **Type**: Server Components (default)
**Responsibilities**:

- Authentication/authorization checks
- Database queries and API calls
- Server-side data processing
- Error handling and redirects
- Metadata generation

```typescript
// ✅ GOOD: Page component focused on data
export default async function PromptManagementPage() {
  const session = await auth(); // Server-side auth check

  if (!session?.user) {
    redirect('/sign-in');
  }

  const organization = await getOrganization(session.orgId);
  const prompts = await getPrompts(organization.id);

  return (
    <PromptManagementView
      organization={organization}
      prompts={prompts}
      userRole={session.user.role}
    />
  );
}

// Generate metadata server-side
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Prompt Management',
    description: 'Manage your MCP prompts and templates'
  };
}
```

### View Components

**Purpose**: Presentation and layout **Type**: Server or Client Components (as needed)
**Responsibilities**:

- UI rendering and layout
- Prop-based data display
- Compose smaller components
- Handle loading states

```typescript
// ✅ GOOD: View component focused on presentation
interface PromptManagementViewProps {
  organization: Organization;
  prompts: Prompt[];
  userRole: string;
}

export function PromptManagementView({
  organization,
  prompts,
  userRole
}: PromptManagementViewProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader title="Prompt Management" />

      {userRole === 'admin' && (
        <CreatePromptButton /> // Client component for interactivity
      )}

      <PromptList prompts={prompts} />

      <PromptStats
        total={prompts.length}
        organization={organization.name}
      />
    </div>
  );
}
```

## Data Fetching Patterns

### ✅ Server Component Data Fetching (Preferred)

```typescript
// Direct async data fetching in Server Components
export default async function UserDashboard() {
  // Parallel data fetching
  const [user, projects, notifications] = await Promise.all([
    getUser(),
    getProjects(),
    getNotifications()
  ]);

  return (
    <DashboardView
      user={user}
      projects={projects}
      notifications={notifications}
    />
  );
}
```

### ✅ Client Component Data Fetching (When Needed)

```typescript
"use client";

import { useQuery } from '@tanstack/react-query';

export function LiveStatusIndicator() {
  const { data: status } = useQuery({
    queryKey: ['server-status'],
    queryFn: fetchServerStatus,
    refetchInterval: 5000 // Real-time updates
  });

  return <StatusBadge status={status} />;
}
```

### ❌ Anti-Patterns to Avoid

```typescript
// ❌ BAD: useEffect in Server Component
export default function Page() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData().then(setData); // This runs twice!
  }, []);

  return <div>{data?.title}</div>;
}

// ❌ BAD: Mixing data fetching with presentation
export default function UserProfile() {
  const [user, setUser] = useState(null);

  // Data fetching mixed with UI logic
  useEffect(() => { /* ... */ }, []);

  return (
    <div className="profile-container">
      {/* Lots of JSX mixed with data logic */}
    </div>
  );
}
```

## Server vs Client Components

### When to Use Server Components

- **Default choice** for all components
- Data fetching from databases/APIs
- Sensitive operations (authentication, payments)
- SEO-critical content
- Large dependencies (markdown parsers, etc.)

```typescript
// Server Component (default)
export default async function BlogPost({ slug }: { slug: string }) {
  const post = await getPost(slug); // Direct database access
  const relatedPosts = await getRelatedPosts(post.tags);

  return (
    <article>
      <h1>{post.title}</h1>
      <MarkdownRenderer content={post.content} />
      <RelatedPosts posts={relatedPosts} />
    </article>
  );
}
```

### When to Use Client Components

- User interactivity (forms, buttons, modals)
- Browser APIs (localStorage, geolocation)
- React hooks (useState, useEffect, useContext)
- Event listeners
- Real-time features

```typescript
"use client";

export function PromptEditor({ initialPrompt }: { initialPrompt: string }) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isValid, setIsValid] = useState(true);

  const handleSave = async () => {
    // Client-side validation and submission
    await savePrompt(prompt);
  };

  return (
    <div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button onClick={handleSave}>Save Prompt</button>
    </div>
  );
}
```

## Project Structure Guidelines

### Recommended Directory Structure

```
src/
├── app/                    # App Router pages
│   ├── (auth)/            # Route groups
│   │   ├── sign-in/
│   │   │   └── page.tsx   # Server Component (data fetching)
│   │   └── layout.tsx
│   ├── dashboard/
│   │   ├── page.tsx       # Server Component (data fetching)
│   │   ├── loading.tsx    # Loading UI
│   │   └── error.tsx      # Error boundary
│   └── layout.tsx
├── components/            # Reusable components
│   ├── ui/               # Base UI components (mostly client)
│   ├── views/            # Page view components
│   └── forms/            # Form components (client)
├── lib/                  # Utilities and services
│   ├── auth.ts          # Authentication logic
│   ├── db.ts            # Database client
│   └── utils.ts         # Helper functions
└── types/               # TypeScript definitions
```

### File Naming Convention

```
page.tsx              # Route page (Server Component)
layout.tsx           # Route layout (Server Component)
loading.tsx          # Loading UI (Server Component)
error.tsx            # Error UI (Client Component)
not-found.tsx        # 404 UI (Server Component)

PageView.tsx         # View component (Server/Client as needed)
InteractiveWidget.tsx # Client component
ServerWidget.tsx     # Server component (when explicit)
```

## Common Patterns

### 1. Authentication Layout Pattern

```typescript
// app/dashboard/layout.tsx
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth(); // Server-side auth

  if (!session?.user) {
    redirect('/sign-in');
  }

  return (
    <div className="dashboard-layout">
      <Sidebar user={session.user} />
      <main>{children}</main>
    </div>
  );
}
```

### 2. Data Loading with Suspense

```typescript
// app/prompts/page.tsx
export default function PromptsPage() {
  return (
    <div>
      <h1>Prompts</h1>
      <Suspense fallback={<PromptsLoading />}>
        <PromptsList />
      </Suspense>
    </div>
  );
}

// Separate async component for data fetching
async function PromptsList() {
  const prompts = await getPrompts();
  return <PromptListView prompts={prompts} />;
}
```

### 3. Server Actions for Mutations

```typescript
// Server Action (can be in same file or separate)
async function createPrompt(formData: FormData) {
  'use server';

  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const prompt = await db.prompt.create({
    data: {
      name: formData.get('name'),
      template: formData.get('template'),
      organizationId: session.orgId,
    }
  });

  revalidatePath('/prompts');
  redirect(`/prompts/${prompt.id}`);
}

// Client Component using the Server Action
"use client";
export function CreatePromptForm() {
  return (
    <form action={createPrompt}>
      <input name="name" placeholder="Prompt name" />
      <textarea name="template" placeholder="Prompt template" />
      <button type="submit">Create Prompt</button>
    </form>
  );
}
```

### 4. Progressive Enhancement Pattern

```typescript
// Server Component provides base functionality
export default async function CommentSection({ postId }: { postId: string }) {
  const comments = await getComments(postId);

  return (
    <div>
      <CommentList comments={comments} />
      <AddCommentForm postId={postId} /> {/* Enhanced with JS */}
    </div>
  );
}

// Client Component adds interactivity
"use client";
export function AddCommentForm({ postId }: { postId: string }) {
  const [optimisticComments, addOptimisticComment] = useOptimistic(/* ... */);

  // Works without JS, enhanced with JS
  return <form action={addComment}>/* ... */</form>;
}
```

## Performance Best Practices

### 1. Minimize Client Components

```typescript
// ✅ GOOD: Only interactive parts are client components
export default async function ArticlePage() {
  const article = await getArticle(); // Server

  return (
    <article>
      <h1>{article.title}</h1>
      <p>{article.content}</p>
      <LikeButton articleId={article.id} /> {/* Only this is client */}
    </article>
  );
}
```

### 2. Use Suspense for Loading States

```typescript
// ✅ GOOD: Granular loading states
export default function Dashboard() {
  return (
    <div>
      <Suspense fallback={<UserHeaderSkeleton />}>
        <UserHeader />
      </Suspense>

      <Suspense fallback={<ChartsSkeleton />}>
        <Charts />
      </Suspense>
    </div>
  );
}
```

### 3. Optimize Data Fetching

```typescript
// ✅ GOOD: Parallel data fetching
export default async function UserPage({ params }: { params: { id: string } }) {
  // Fetch in parallel, not sequential
  const [user, posts, followers] = await Promise.all([
    getUser(params.id),
    getUserPosts(params.id),
    getUserFollowers(params.id)
  ]);

  return <UserView user={user} posts={posts} followers={followers} />;
}
```

### 4. Strategic Client Boundary Placement

```typescript
// ✅ GOOD: Client boundary at the right level
export default async function SearchPage() {
  return (
    <div>
      <SearchHeader /> {/* Server Component */}
      <SearchFilters /> {/* Client Component for interactivity */}
      <Suspense fallback={<ResultsSkeleton />}>
        <SearchResults /> {/* Server Component */}
      </Suspense>
    </div>
  );
}
```

## Migration Guidelines

### From Pages Router to App Router

1. **Identify Data Fetching**: Move `getServerSideProps`/`getStaticProps` logic into Server
   Components
2. **Separate Concerns**: Split page components into page (data) + view (presentation)
3. **Mark Client Components**: Add `"use client"` to interactive components
4. **Update File Structure**: Move to the new `app/` directory structure

### Example Migration

```typescript
// Before: Pages Router
export default function ProductsPage({ products }) {
  const [filter, setFilter] = useState('');
  // Mixed data and presentation logic
  return (
    <div>
      <input onChange={(e) => setFilter(e.target.value)} />
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export async function getServerSideProps() {
  const products = await getProducts();
  return { props: { products } };
}

// After: App Router
// app/products/page.tsx (Server Component)
export default async function ProductsPage() {
  const products = await getProducts(); // Direct data fetching
  return <ProductsView products={products} />;
}

// components/ProductsView.tsx (View Component)
export function ProductsView({ products }) {
  return (
    <div>
      <ProductFilter /> {/* Client Component */}
      <ProductGrid products={products} />
    </div>
  );
}
```

## Conclusion

The App Router's server-first approach with React Server Components provides:

- **Better Performance**: Less JavaScript shipped to client
- **Improved SEO**: Server-rendered by default
- **Better DX**: Simpler data fetching patterns
- **Security**: Sensitive logic stays on server

**Key Principle**: Start with Server Components, add `"use client"` only when you need browser APIs
or interactivity.

---

_For project-specific examples, see our existing components in `apps/mcp-admin/src/app/` and
`apps/mcp-admin/src/components/`_
