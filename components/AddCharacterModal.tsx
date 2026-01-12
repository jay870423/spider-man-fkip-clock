import React, { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (name: string) => Promise<void>;
}

export const AddCharacterModal: React.FC<Props> = ({ isOpen, onClose, onGenerate }) => {
  const [name, setName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsGenerating(true);
    await onGenerate(name.trim());
    setIsGenerating(false);
    setName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl transform transition-all scale-100">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-full mx-auto flex items-center justify-center text-3xl shadow-lg mb-4">
            ✨
          </div>
          <h2 className="text-2xl font-display text-white tracking-wide">New Citizen</h2>
          <p className="text-white/50 text-sm mt-2">
            Enter a name (e.g., "Chief Bogo", "Bellwether") and AI will generate their personality & theme.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
             <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Character Name..."
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-center text-lg"
                autoFocus
             />
          </div>

          <button
            type="submit"
            disabled={isGenerating || !name.trim()}
            className={`
                w-full py-3 rounded-xl font-bold tracking-wider uppercase transition-all
                ${isGenerating 
                    ? 'bg-white/10 text-white/50 cursor-not-allowed animate-pulse' 
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg hover:shadow-purple-500/25 transform hover:-translate-y-0.5'
                }
            `}
          >
            {isGenerating ? 'Summoning...' : 'Create Character'}
          </button>
        </form>
      </div>
    </div>
  );
};
