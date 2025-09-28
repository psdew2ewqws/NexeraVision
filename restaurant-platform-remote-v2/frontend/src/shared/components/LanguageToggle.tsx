import { useLanguage } from '../contexts/LanguageContext'
import { GlobeAltIcon, LanguageIcon } from '@heroicons/react/24/outline'
import { PremiumButton, ButtonGroup } from './PremiumButton'

interface LanguageToggleProps {
  variant?: 'full' | 'compact' | 'icon-only'
  className?: string
  showFlags?: boolean
}

export default function LanguageToggle({ 
  variant = 'full', 
  className = '',
  showFlags = true 
}: LanguageToggleProps) {
  const { language, setLanguage, isRTL } = useLanguage()

  if (variant === 'icon-only') {
    return (
      <div className={`relative group ${className}`}>
        <PremiumButton
          variant="ghost"
          size="sm"
          icon={<GlobeAltIcon className="w-4 h-4" />}
          className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        />
        <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-slate-200 py-2 px-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-[140px]">
          <button
            onClick={() => setLanguage('en')}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              language === 'en' 
                ? 'bg-slate-100 text-slate-900' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {showFlags && <span className="text-base">🇺🇸</span>}
            <span>English</span>
            {language === 'en' && (
              <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full"></div>
            )}
          </button>
          <button
            onClick={() => setLanguage('ar')}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              language === 'ar' 
                ? 'bg-slate-100 text-slate-900' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {showFlags && <span className="text-base">🇯🇴</span>}
            <span>العربية</span>
            {language === 'ar' && (
              <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full"></div>
            )}
          </button>
        </div>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <ButtonGroup className={className}>
        <PremiumButton
          variant={language === 'en' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setLanguage('en')}
          className={`transition-all duration-200 ${
            language === 'en' 
              ? 'bg-slate-800 text-white shadow-md' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          {showFlags ? '🇺🇸' : 'EN'}
        </PremiumButton>
        <PremiumButton
          variant={language === 'ar' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setLanguage('ar')}
          className={`transition-all duration-200 ${
            language === 'ar' 
              ? 'bg-slate-800 text-white shadow-md' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          {showFlags ? '🇯🇴' : 'ع'}
        </PremiumButton>
      </ButtonGroup>
    )
  }

  // Full variant
  return (
    <div className={`bg-white rounded-xl p-1 shadow-sm border border-slate-200 ${className}`}>
      <ButtonGroup spacing="tight">
        <PremiumButton
          variant={language === 'en' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setLanguage('en')}
          className={`transition-all duration-300 ${
            language === 'en' 
              ? 'bg-slate-800 text-white shadow-md' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center space-x-2">
            {showFlags && <span className="text-base">🇺🇸</span>}
            <span className="font-medium">English</span>
          </div>
        </PremiumButton>
        <PremiumButton
          variant={language === 'ar' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setLanguage('ar')}
          className={`transition-all duration-300 ${
            language === 'ar' 
              ? 'bg-slate-800 text-white shadow-md' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center space-x-2">
            {showFlags && <span className="text-base">🇯🇴</span>}
            <span className="font-medium">العربية</span>
          </div>
        </PremiumButton>
      </ButtonGroup>
    </div>
  )
}