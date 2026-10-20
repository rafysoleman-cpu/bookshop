import { Link } from 'react-router-dom'
import {
  BookOpen,
  Shield,
  Target,
  Heart,
  Globe
} from 'lucide-react'

const AboutPage = () => {
  const values = [
    {
      title: 'Reader First',
      description: 'Every decision starts with helping readers find books they will enjoy.',
      icon: Heart
    },
    {
      title: 'Accurate Catalog',
      description: 'Book details, availability, and pricing are kept clear and up to date.',
      icon: Shield
    },
    {
      title: 'Easy Discovery',
      description: 'Browse by genre, author, format, and language to find the right title quickly.',
      icon: Target
    },
    {
      title: 'Reliable Service',
      description: 'Orders, delivery updates, and support are handled with care from start to finish.',
      icon: Globe
    }
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900/40 rounded-full mb-6">
          <BookOpen className="w-8 h-8 text-primary-600 dark:text-primary-400" />
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-slate-100 mb-6">
          About BookShop
        </h1>
        <p className="text-xl text-gray-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
          BookShop is an online bookstore built to make discovering, buying, and
          receiving books simple.
        </p>
      </div>

      {/* Story Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-8 lg:p-12 border border-gray-200 dark:border-slate-700 mb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-6 text-center">
            Our Story
          </h2>

          <div className="prose prose-lg max-w-none text-gray-700 dark:text-slate-300 text-center">
            <p className="mb-6">
              BookShop brings books together in one organized catalog. Readers can
              explore genres, compare editions and formats, check availability, and
              place an order without navigating a crowded catalog.
            </p>

            <p className="mb-6">
              Our catalog is managed directly, so book information stays consistent
              and inventory is handled in one place. That makes it easier to keep the
              storefront focused on the books themselves.
            </p>

            <p>
              We continue to improve the storefront, search, and order experience as
              the catalog grows.
            </p>
          </div>
        </div>
      </div>

      {/* Mission & Vision */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-8 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center space-x-3 mb-4">
            <Target className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Our Mission</h2>
          </div>

          <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
            To give readers a clear, dependable place to find books across genres,
            formats, and languages while keeping the buying experience straightforward.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-8 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center space-x-3 mb-4">
            <Globe className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Our Vision</h2>
          </div>

          <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
            To be a trusted bookstore where finding a new title is easy, book details
            are reliable, and every order is handled with care.
          </p>
        </div>
      </div>

      {/* Values Section */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100 text-center mb-12">
          Our Values
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value) => {
            const Icon = value.icon
            return (
              <div key={value.title} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900/40 rounded-full mb-4">
                  <Icon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">
                  {value.title}
                </h3>
                <p className="text-gray-600 dark:text-slate-400 text-sm leading-relaxed">
                  {value.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary-600 rounded-lg p-8 lg:p-12 text-center">
        <h2 className="text-3xl font-bold text-white mb-6">
          Ready to Find Your Next Book?
        </h2>

        <p className="text-primary-100 text-lg mb-8 max-w-2xl mx-auto">
          Browse the catalog by genre, author, format, or language.
        </p>

        <div className="flex justify-center">
          <Link
            to="/products"
            className="btn bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 hover:bg-gray-100 dark:hover:bg-slate-800/70 font-medium"
          >
            Browse Books
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AboutPage
