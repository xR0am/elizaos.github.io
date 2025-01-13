import { Metadata } from 'next'

interface ProfilePageProps {
  params: {
    username: string
  }
}

export function generateStaticParams() {
  // Return a default username and any other known usernames you want to pre-render
  return [
    { username: 'default' }
  ]
}

export function generateMetadata({ params }: ProfilePageProps): Metadata {
  return {
    title: `${params.username}'s Profile | ElizaOS`,
    description: `Profile page for ${params.username}`,
  }
}

export default function ProfilePage({ params }: ProfilePageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Profile: {params.username}</h1>
      {/* Add your profile content here */}
    </div>
  )
}
