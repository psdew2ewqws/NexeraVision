// ================================================
// Platform Sync Controls Component
// Restaurant Platform v2 - Sync Configuration UI
// ================================================

import { Fragment } from 'react';
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { Listbox, Transition } from '@headlessui/react';
import { motion } from 'framer-motion';
import { DeliveryPlatform } from '../../../types/platform-menu.types';
import { PlatformMenu } from '../hooks/usePlatformSync';
import { getLocalizedText } from '../../../lib/menu-utils';
import { useLanguage } from '../../../contexts/LanguageContext';

// ================================================
// INTERFACES
// ================================================

interface PlatformSyncControlsProps {
  menus: PlatformMenu[];
  selectedMenuId: string;
  onMenuSelect: (menuId: string) => void;
  selectedPlatforms: DeliveryPlatform[];
  onPlatformToggle: (platform: DeliveryPlatform) => void;
  isDisabled?: boolean;
}

// ================================================
// PLATFORM METADATA
// ================================================

const PLATFORM_CONFIG = {
  [DeliveryPlatform.CAREEM]: {
    name: 'Careem Now',
    color: 'bg-green-500',
    description: 'External delivery platform',
    syncTime: '~15s',
    icon: '🚗'
  },
  [DeliveryPlatform.TALABAT]: {
    name: 'Talabat',
    color: 'bg-orange-500',
    description: 'External delivery platform',
    syncTime: '~12s',
    icon: '🍔'
  },
  [DeliveryPlatform.WEBSITE]: {
    name: 'Website',
    color: 'bg-blue-500',
    description: 'Internal platform',
    syncTime: '~2s',
    icon: '🌐'
  },
  [DeliveryPlatform.CALL_CENTER]: {
    name: 'Call Center',
    color: 'bg-purple-500',
    description: 'Internal platform',
    syncTime: '~1s',
    icon: '📞'
  },
  [DeliveryPlatform.MOBILE_APP]: {
    name: 'Mobile App',
    color: 'bg-pink-500',
    description: 'Internal platform',
    syncTime: '~3s',
    icon: '📱'
  },
  [DeliveryPlatform.KIOSK]: {
    name: 'Kiosk',
    color: 'bg-indigo-500',
    description: 'Internal platform',
    syncTime: '~2s',
    icon: '🖥️'
  },
  [DeliveryPlatform.IN_STORE_DISPLAY]: {
    name: 'In-Store Display',
    color: 'bg-teal-500',
    description: 'Internal platform',
    syncTime: '~1s',
    icon: '📺'
  },
  [DeliveryPlatform.CHATBOT]: {
    name: 'Chatbot',
    color: 'bg-gray-500',
    description: 'Internal platform',
    syncTime: '~1s',
    icon: '🤖'
  },
  [DeliveryPlatform.ONLINE_ORDERING]: {
    name: 'Online Ordering',
    color: 'bg-cyan-500',
    description: 'Internal platform',
    syncTime: '~2s',
    icon: '🛒'
  }
};

// ================================================
// PLATFORM SYNC CONTROLS COMPONENT
// ================================================

export const PlatformSyncControls: React.FC<PlatformSyncControlsProps> = ({
  menus,
  selectedMenuId,
  onMenuSelect,
  selectedPlatforms,
  onPlatformToggle,
  isDisabled = false
}) => {
  const { language } = useLanguage();
  const selectedMenu = menus.find(menu => menu.id === selectedMenuId);
  const availablePlatforms = Object.values(DeliveryPlatform);

  return (
    <div className="space-y-6">
      {/* Menu Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Menu
        </label>
        <Listbox
          value={selectedMenuId}
          onChange={onMenuSelect}
          disabled={isDisabled}
        >
          <div className=\"relative\">
            <Listbox.Button className={`relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow border border-gray-300 focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <span className=\"block truncate\">
                {selectedMenu ? getLocalizedText(selectedMenu.name, language) : 'Select a menu...'}
              </span>
              <span className=\"pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2\">
                <ChevronDownIcon className=\"h-5 w-5 text-gray-400\" aria-hidden=\"true\" />
              </span>
            </Listbox.Button>

            <Transition
              as={Fragment}
              leave=\"transition ease-in duration-100\"
              leaveFrom=\"opacity-100\"
              leaveTo=\"opacity-0\"
            >
              <Listbox.Options className=\"absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10\">
                {menus.map((menu) => (
                  <Listbox.Option
                    key={menu.id}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-10 pr-4 ${
                        active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                      }`
                    }
                    value={menu.id}
                  >
                    {({ selected }) => (
                      <>
                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                          {getLocalizedText(menu.name, language)}
                        </span>
                        <span className=\"text-xs text-gray-500 block\">
                          {menu.itemCount} items • {menu.platform}
                        </span>
                        {selected && (
                          <span className=\"absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600\">
                            <CheckIcon className=\"h-5 w-5\" aria-hidden=\"true\" />
                          </span>
                        )}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        </Listbox>

        {selectedMenu && (
          <div className=\"mt-2 text-sm text-gray-600\">
            <span className=\"font-medium\">{selectedMenu.itemCount}</span> items •
            Last synced: {selectedMenu.lastSyncedAt
              ? new Date(selectedMenu.lastSyncedAt).toLocaleDateString()
              : 'Never'
            }
          </div>
        )}
      </div>

      {/* Platform Selection */}
      <div>
        <label className=\"block text-sm font-medium text-gray-700 mb-3\">
          Select Platforms (Multi-Platform Sync)
        </label>

        <div className=\"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3\">
          {availablePlatforms.map((platform) => {
            const config = PLATFORM_CONFIG[platform];
            const isSelected = selectedPlatforms.includes(platform);

            return (
              <motion.div
                key={platform}
                whileHover={{ scale: isDisabled ? 1 : 1.02 }}
                whileTap={{ scale: isDisabled ? 1 : 0.98 }}
                className={`relative`}
              >
                <button
                  type=\"button\"
                  onClick={() => !isDisabled && onPlatformToggle(platform)}
                  disabled={isDisabled}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className=\"flex items-start justify-between\">
                    <div className=\"flex items-center space-x-3\">
                      <div className={`w-8 h-8 rounded-full ${config.color} flex items-center justify-center text-white text-sm font-bold`}>
                        {config.icon}
                      </div>
                      <div>
                        <h4 className=\"font-medium text-gray-900\">{config.name}</h4>
                        <p className=\"text-sm text-gray-500\">{config.description}</p>
                        <p className=\"text-xs text-gray-400 mt-1\">Est. sync time: {config.syncTime}</p>
                      </div>
                    </div>

                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className=\"w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center\"
                      >
                        <CheckIcon className=\"w-3 h-3 text-white\" />
                      </motion.div>
                    )}
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>

        {selectedPlatforms.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className=\"mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200\"
          >
            <div className=\"flex items-center justify-between text-sm\">
              <span className=\"text-blue-800 font-medium\">
                Selected Platforms: {selectedPlatforms.length}
              </span>
              <span className=\"text-blue-600\">
                Estimated total sync time: ~{
                  Math.max(...selectedPlatforms.map(p =>
                    parseInt(PLATFORM_CONFIG[p].syncTime.replace(/[^0-9]/g, ''))
                  ))
                }s
              </span>
            </div>

            <div className=\"mt-2 flex flex-wrap gap-2\">
              {selectedPlatforms.map((platform) => (
                <span
                  key={platform}
                  className=\"inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800\"
                >
                  {PLATFORM_CONFIG[platform].icon} {PLATFORM_CONFIG[platform].name}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Sync Options */}
      <div className=\"border-t border-gray-200 pt-4\">
        <h4 className=\"text-sm font-medium text-gray-700 mb-3\">Sync Options</h4>

        <div className=\"space-y-3 text-sm\">
          <div className=\"flex items-center justify-between\">
            <span className=\"text-gray-600\">Parallel Processing</span>
            <span className=\"text-green-600 font-medium\">✓ Enabled</span>
          </div>

          <div className=\"flex items-center justify-between\">
            <span className=\"text-gray-600\">Max Concurrency</span>
            <span className=\"text-gray-900 font-medium\">4 platforms</span>
          </div>

          <div className=\"flex items-center justify-between\">
            <span className=\"text-gray-600\">Stop on First Error</span>
            <span className=\"text-red-600 font-medium\">✗ Disabled</span>
          </div>

          <div className=\"flex items-center justify-between\">
            <span className=\"text-gray-600\">Real-time Updates</span>
            <span className=\"text-green-600 font-medium\">✓ Enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
};