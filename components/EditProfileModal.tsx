import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import { AVATAR_COLORS, getInitials } from '../utils';
import TrashIcon from './icons/TrashIcon';

interface EditProfileModalProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSave: (user: User) => void;
  onDelete: (userId: string) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, user, onClose, onSave, onDelete }) => {
  const [editedName, setEditedName] = useState('');
  const [editedColor, setEditedColor] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      setEditedName(user.name);
      setEditedColor(user.avatarColor);
      setShowDeleteConfirm(false);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleColorChange = () => {
    const currentIndex = AVATAR_COLORS.indexOf(editedColor);
    const nextIndex = (currentIndex + 1) % AVATAR_COLORS.length;
    setEditedColor(AVATAR_COLORS[nextIndex]);
  };

  const handleSave = () => {
    if (editedName.trim()) {
      onSave({ ...user, name: editedName.trim(), avatarColor: editedColor });
    }
  };

  const handleDelete = () => {
    onDelete(user.id);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg p-8 shadow-2xl max-w-md w-full border border-gray-700" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6 text-center">Editar Perfil</h2>
        
        <div className="flex flex-col items-center mb-6">
          <button onClick={handleColorChange} className={`w-32 h-32 rounded-full ${editedColor} flex items-center justify-center text-white text-5xl font-bold border-4 border-transparent hover:border-white transition-all cursor-pointer`} title="Cambiar color">
              {getInitials(editedName)}
          </button>
          <p className="text-xs text-gray-400 mt-2">Haz clic en el avatar para cambiar el color</p>
        </div>

        <div className="mb-4">
          <label htmlFor="edit-name-input" className="block text-sm font-bold mb-2 text-gray-300">Nombre del Perfil</label>
          <input
            id="edit-name-input"
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            className="w-full text-lg p-3 bg-gray-900 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            required
            autoFocus
          />
        </div>

        {!showDeleteConfirm ? (
          <div className="space-y-3 mt-8">
            <button
              onClick={handleSave}
              disabled={!editedName.trim()}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50"
            >
              Guardar Cambios
            </button>
            <button onClick={onClose} type="button" className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-colors">
              Cancelar
            </button>
            <button onClick={() => setShowDeleteConfirm(true)} className="w-full text-red-400 hover:text-white hover:bg-red-600/50 transition-colors py-2 rounded-lg flex items-center justify-center gap-2">
              <TrashIcon /> Eliminar Perfil
            </button>
          </div>
        ) : (
          <div className="mt-8 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-center">
            <p className="font-bold text-red-300">¿Estás seguro?</p>
            <p className="text-sm text-gray-300 my-2">Esta acción no se puede deshacer.</p>
            <div className="flex gap-4 mt-4">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg">No, cancelar</button>
              <button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg">Sí, eliminar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditProfileModal;