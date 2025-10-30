"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import type { FoodItem } from "../types"
import { CameraIcon, UploadIcon, SearchIcon, XIcon } from "./Icons"
import Loader from "./Loader"
import { useTranslation } from "../contexts/LanguageContext"
import { identifyFoodFromImage, searchFoodDatabase } from "../services/geminiService"
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

type ModalTab = "camera" | "upload" | "search"

interface LogFoodModalProps {
  onClose: () => void
  onAddFood: (foodItems: FoodItem[]) => Promise<void>
  initialTab: ModalTab
}

const LogFoodModal: React.FC<LogFoodModalProps> = ({ onClose, onAddFood, initialTab }) => {
  const [activeTab, setActiveTab] = useState<ModalTab>(initialTab)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<FoodItem[] | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const { t } = useTranslation()

  const handleImageAnalysis = async (base64Image: string, mimeType: string) => {
    setIsLoading(true)
    setError(null)
    setAnalysisResult(null)
    try {
      const items = await identifyFoodFromImage(base64Image, mimeType)
      setAnalysisResult(items)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to analyze image. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const takeOrSelectPhoto = useCallback(async (source: CameraSource) => {
    try {
        const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.Base64,
            source,
        });

        if (image.base64String) {
            handleImageAnalysis(image.base64String, `image/${image.format}`);
        } else {
            onClose();
        }
    } catch (error: any) {
        if (error.message && error.message.toLowerCase().includes('cancelled')) {
            onClose();
            return;
        }
        const isCamera = source === CameraSource.Camera;
        console.error(`Error ${isCamera ? 'taking' : 'selecting'} picture`, error);
        setError(`Unable to access ${isCamera ? 'camera' : 'photos'}. Please ensure permissions are granted in settings.`);
    }
  }, [onClose]);

  useEffect(() => {
    if (analysisResult || isLoading || error) {
      return;
    }

    if (activeTab === "camera") {
        takeOrSelectPhoto(CameraSource.Camera);
    } else if (activeTab === "upload") {
        takeOrSelectPhoto(CameraSource.Photos);
    }
  }, [activeTab, analysisResult, isLoading, error, takeOrSelectPhoto]);


  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setIsLoading(true)
    setError(null)
    setAnalysisResult(null)
    try {
      const item = await searchFoodDatabase(searchQuery)
      setAnalysisResult(item ? [item] : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const resetState = () => {
    setAnalysisResult(null)
    setError(null)
    setSearchQuery("")
    if (activeTab === 'camera') {
        takeOrSelectPhoto(CameraSource.Camera);
    } else if (activeTab === 'upload') {
        takeOrSelectPhoto(CameraSource.Photos);
    }
  }

  const changeTab = (tab: ModalTab) => {
    if(activeTab === tab) return;
    setAnalysisResult(null)
    setError(null)
    setSearchQuery("")
    setActiveTab(tab)
  }

  const renderContent = () => {
    if (isLoading)
      return (
        <div className="flex flex-col items-center justify-center py-6 sm:py-8 h-full">
          <Loader message="Processing..." />
          <div className="mt-4 text-orange-500 animate-pulse text-sm sm:text-base">Analyzing your input...</div>
        </div>
      )
    
    if ((activeTab === 'camera' || activeTab === 'upload') && !analysisResult && !error) {
        const message = activeTab === 'camera' ? 'Opening Camera...' : 'Opening Gallery...';
        return (
            <div className="flex flex-col items-center justify-center py-6 sm:py-8 h-full">
                <Loader message={message} />
            </div>
        );
    }

    if (error)
      return (
        <div className="text-red-600 text-center p-4 sm:p-6 bg-red-50 rounded-xl border border-red-200 text-sm sm:text-base">
          {error}
          <button
            onClick={() => {
                setError(null);
                if (activeTab === 'camera') takeOrSelectPhoto(CameraSource.Camera);
                if (activeTab === 'upload') takeOrSelectPhoto(CameraSource.Photos);
            }}
            className="mt-4 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-600 rounded-lg transition-all duration-300 font-medium text-sm"
          >
            Try Again
          </button>
        </div>
      )

    if (analysisResult) {
      return (
        <div className="space-y-4">
          <h3 className="text-lg sm:text-xl font-bold text-green-600">{t('analysisResults')}</h3>
          {analysisResult.length > 0 ? (
            <div className="space-y-3 max-h-[40vh] sm:max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-gray-100">
              {analysisResult.map((item, index) => (
                <div
                  key={index}
                  className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all"
                >
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">{item.name}</p>
                  <p className="text-xs sm:text-sm text-orange-600">
                    {item.portion} - {item.calories} kcal
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4 text-sm">No food items identified.</p>
          )}
          <div className="flex gap-3 sm:gap-4 mt-4">
            <button
              onClick={resetState}
              className="flex-1 bg-white hover:bg-gray-50 text-gray-700 py-2 sm:py-3 rounded-lg border border-gray-300 hover:border-gray-400 transition-all duration-300 font-medium text-sm"
            >
              {t('analyzeAnother')}
            </button>
            <button
              onClick={async () => {
                if (analysisResult.length > 0) {
                  await onAddFood(analysisResult);
                  onClose();
                }
              }}
              disabled={analysisResult.length === 0}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 sm:py-3 rounded-lg disabled:bg-gray-300 disabled:text-gray-500 transition-all duration-300 text-sm"
            >
              {t('addToLog')}
            </button>
          </div>
        </div>
      )
    }

    if (activeTab === 'search') {
        return (
            <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-2">
                <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., '1 apple' or 'chicken breast'"
                className="w-full bg-white text-gray-900 p-3 sm:p-4 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent focus:outline-none transition-all duration-300 placeholder-gray-400 text-sm sm:text-base"
                />
                <button
                type="submit"
                disabled={!searchQuery.trim()}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white p-3 sm:p-4 rounded-xl disabled:bg-gray-300 disabled:text-gray-500 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
                >
                <SearchIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
            </div>
            </form>
        )
    }
  }

  const TabButton = ({ tab, icon, label }: { tab: ModalTab; icon: React.ReactNode; label: string }) => (
    <button
      onClick={() => changeTab(tab)}
      className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-3 sm:py-4 font-semibold transition-all duration-300 relative text-xs sm:text-sm
        ${activeTab === tab ? "text-orange-600" : "text-gray-500 hover:text-gray-700"}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {activeTab === tab && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-orange-600 rounded-t-full"></div>
      )}
    </button>
  )

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-lg flex items-center justify-center z-50 p-0">
      <div
        className={`bg-white w-full h-full sm:rounded-3xl sm:shadow-2xl sm:shadow-gray-300/50 sm:max-w-md sm:max-h-[90vh] sm:m-auto text-gray-900 relative flex flex-col border border-gray-200 overflow-hidden`}
      >
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <h2 className="text-xl sm:text-2xl font-bold text-center bg-gradient-to-r from-orange-600 to-green-600 bg-clip-text text-transparent">
            {t('logYourMeal')}
          </h2>
          <button
            onClick={onClose}
            className="absolute top-3 sm:top-4 right-3 sm:right-4 text-gray-400 hover:text-orange-500 hover:bg-orange-50 p-2 rounded-full transition-all duration-300"
            aria-label="Close modal"
          >
            <XIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="flex border-b border-gray-100 px-4 sm:px-6">
          <TabButton tab="camera" icon={<CameraIcon className="w-4 h-4 sm:w-5 sm:h-5" />} label={t('camera')} />
          <TabButton tab="upload" icon={<UploadIcon className="w-4 h-4 sm:w-5 sm:h-5" />} label={t('upload')} />
          <TabButton tab="search" icon={<SearchIcon className="w-4 h-4 sm:w-5 sm:h-5" />} label={t('search')} />
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

export default LogFoodModal