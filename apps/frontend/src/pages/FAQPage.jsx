import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
  MessageCircle,
  Search,
  Package,
  CreditCard,
  User
} from 'lucide-react'

const FAQPage = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedItems, setExpandedItems] = useState(new Set())

  const faqCategories = [
    {
      title: 'Getting Started',
      icon: HelpCircle,
      questions: [
        {
          id: 1,
          question: 'How do I create an account?',
          answer: 'Click on "Sign Up" in the header, enter your name, email address, and password, then verify your email address.'
        },
        {
          id: 2,
          question: 'Is registration free?',
          answer: 'Yes. Creating an account is free, and you can browse the catalog without a membership fee.'
        },
        {
          id: 3,
          question: 'What information do I need to provide?',
          answer: 'You need your name, email address, and a password. You can add delivery addresses later from your account.'
        }
      ]
    },
    {
      title: 'Orders & Shipping',
      icon: Package,
      questions: [
        {
          id: 4,
          question: 'How can I track my order?',
          answer: 'Open your account and go to Orders. Each order shows its current status and available tracking details.'
        },
        {
          id: 5,
          question: 'What delivery options are available?',
          answer: 'Available delivery methods and their costs are shown at checkout before you place the order.'
        },
        {
          id: 6,
          question: 'Can I change my shipping address?',
          answer: 'Contact support as soon as possible. Address changes may be possible before the order is processed, but not after it has shipped.'
        }
      ]
    },
    {
      title: 'Payments & Returns',
      icon: CreditCard,
      questions: [
        {
          id: 7,
          question: 'What payment methods do you accept?',
          answer: 'Cash on delivery is currently the only payment method. You pay in cash when your order arrives.'
        },
        {
          id: 8,
          question: 'Do I need to enter card details?',
          answer: 'No. BookShop does not collect or store card details because payment is handled in cash on delivery.'
        },
        {
          id: 9,
          question: 'How do I request a return or refund?',
          answer: 'Contact support with your order number and the reason for the request. Support will confirm whether the order is eligible and explain the next steps.'
        }
      ]
    },
    {
      title: 'Account Management',
      icon: User,
      questions: [
        {
          id: 10,
          question: 'How do I reset my password?',
          answer: 'Click "Forgot Password" on the login page, enter your email address, and follow the instructions sent to your email.'
        },
        {
          id: 11,
          question: 'Can I change my email address?',
          answer: 'Yes. Update your email address in account settings and complete the verification step for the new address.'
        },
        {
          id: 12,
          question: 'How do I delete my account?',
          answer: 'You can request account deletion from your account settings. This action is permanent and cannot be undone.'
        }
      ]
    }
  ]

  const toggleExpanded = (id) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const filteredQuestions = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(q =>
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0)

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-4">Frequently Asked Questions</h1>
        <p className="text-xl text-gray-600 dark:text-slate-400 max-w-2xl mx-auto">
          Find answers to common questions about BookShop
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto mb-12">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-slate-500" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for answers..."
            className="search-input w-full"
          />
        </div>
      </div>

      {/* FAQ Categories */}
      <div className="space-y-8">
        {filteredQuestions.map((category) => {
          const Icon = category.icon
          return (
            <div key={category.title} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
              {/* Category Header */}
              <div className="p-6 bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/40 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                    {category.title}
                  </h2>
                </div>
              </div>

              {/* Questions */}
              <div className="divide-y divide-gray-200 dark:divide-slate-700">
                {category.questions.map((item) => (
                  <div key={item.id} className="p-6">
                    <button
                      onClick={() => toggleExpanded(item.id)}
                      className="w-full text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 dark:text-slate-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors pr-8">
                          {item.question}
                        </h3>
                        <div className="flex-shrink-0">
                          {expandedItems.has(item.id) ? (
                            <ChevronUp className="w-5 h-5 text-gray-400 dark:text-slate-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400 dark:text-slate-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Answer */}
                    {expandedItems.has(item.id) && (
                      <div className="mt-4 pl-4 text-gray-600 dark:text-slate-400 leading-relaxed animate-fade-in">
                        {item.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* No Results */}
      {filteredQuestions.every(category => category.questions.length === 0) && (
        <div className="text-center py-16">
          <HelpCircle className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
            No results found
          </h3>
          <p className="text-gray-600 dark:text-slate-400 mb-8">
            Try searching with different keywords or browse our FAQ categories.
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="btn-primary"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Contact Support */}
      <div className="mt-16 bg-primary-50 dark:bg-primary-950/40 rounded-lg p-8 border border-primary-200 dark:border-primary-800">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">
            Still have questions?
          </h2>
          <p className="text-gray-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
            Send us a message and we will help with your account or order.
          </p>

          <Link
            to="/contact"
            className="btn-primary inline-flex items-center justify-center space-x-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Contact Support</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default FAQPage
