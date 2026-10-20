import { useState, useEffect } from 'react'
import { Clock, Sparkles } from 'lucide-react'

const FlashSaleTimer = ({ endTime, className = '' }) => {
  const [timeLeft, setTimeLeft] = useState(null)

  useEffect(() => {
    if (!endTime) return

    const calculateTimeLeft = () => {
      const difference = new Date(endTime) - new Date()
      
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
        const minutes = Math.floor((difference / 1000 / 60) % 60)
        const seconds = Math.floor((difference / 1000) % 60)

        return {
          days: days.toString().padStart(2, '0'),
          hours: hours.toString().padStart(2, '0'),
          minutes: minutes.toString().padStart(2, '0'),
          seconds: seconds.toString().padStart(2, '0')
        }
      }

      return null
    }

    setTimeLeft(calculateTimeLeft())

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [endTime])

  if (!timeLeft) {
    return (
      <div className={`flex items-center space-x-2 text-gray-500 dark:text-slate-400 ${className}`}>
        <Clock className="w-4 h-4" />
        <span className="text-sm">Sale ended</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      <div className="flex items-center space-x-2">
        <Sparkles className="w-5 h-5 text-orange-500 dark:text-orange-400" />
        <span className="font-semibold text-gray-900 dark:text-slate-100">Flash Sale Ends In:</span>
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="bg-red-600 text-white px-3 py-1 rounded-md min-w-[3rem] text-center">
          <div className="text-lg font-bold">{timeLeft.days}</div>
          <div className="text-xs">Days</div>
        </div>
        
        <span className="text-red-600 dark:text-red-400 font-bold">:</span>
        
        <div className="bg-red-600 text-white px-3 py-1 rounded-md min-w-[3rem] text-center">
          <div className="text-lg font-bold">{timeLeft.hours}</div>
          <div className="text-xs">Hours</div>
        </div>
        
        <span className="text-red-600 dark:text-red-400 font-bold">:</span>
        
        <div className="bg-red-600 text-white px-3 py-1 rounded-md min-w-[3rem] text-center">
          <div className="text-lg font-bold">{timeLeft.minutes}</div>
          <div className="text-xs">Mins</div>
        </div>
        
        <span className="text-red-600 dark:text-red-400 font-bold">:</span>
        
        <div className="bg-red-600 text-white px-3 py-1 rounded-md min-w-[3rem] text-center">
          <div className="text-lg font-bold">{timeLeft.seconds}</div>
          <div className="text-xs">Secs</div>
        </div>
      </div>
    </div>
  )
}

export default FlashSaleTimer
