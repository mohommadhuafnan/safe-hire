import React, { createContext, useContext, useState, useCallback } from 'react';
import AIAnalysisModal from '../components/AIAnalysisModal';

const AIModalContext = createContext();

export const AIModalProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalData, setModalData] = useState({
    title: 'Gemini 3.6 Flash AI Analysis',
    initialPrompt: '',
    category: 'general',
    contextData: null
  });

  const openAIModal = useCallback(({ title, initialPrompt, category = 'general', contextData = null } = {}) => {
    setModalData({
      title: title || 'Gemini 3.6 Flash AI Analysis',
      initialPrompt: initialPrompt || '',
      category: category,
      contextData: contextData
    });
    setIsOpen(true);
  }, []);

  const closeAIModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <AIModalContext.Provider value={{ isOpen, openAIModal, closeAIModal, modalData }}>
      {children}
      {isOpen && (
        <AIAnalysisModal
          isOpen={isOpen}
          onClose={closeAIModal}
          title={modalData.title}
          initialPrompt={modalData.initialPrompt}
          category={modalData.category}
          contextData={modalData.contextData}
        />
      )}
    </AIModalContext.Provider>
  );
};

export const useAIModal = () => {
  const context = useContext(AIModalContext);
  if (!context) {
    throw new Error('useAIModal must be used within an AIModalProvider');
  }
  return context;
};
