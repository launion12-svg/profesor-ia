import React, { useState } from 'react';
import type { User } from '../types';
import { getInitials } from '../utils';
import PencilIcon from './icons/PencilIcon';

interface UserSelectionScreenProps {
  users: User[];
  onSelect: (user: User) => void;
  onCreate: (name: string) => void;
  onManageToggle: () => void;
  isManaging: boolean;
  onEdit: (user: User) => void;
}

const UserSelectionScreen: React.FC<UserSelectionScreenProps> = ({ users, onSelect, onCreate, onManageToggle, isManaging, onEdit }) => {
  const [newUserName, setNewUserName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName.trim()) {
      onCreate(newUserName.trim());
      setNewUserName('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4 animate-fade-in">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
          ¿Quién está estudiando?
        </h1>
        <p className="text-lg text-gray-400 mt-4">Selecciona tu perfil o crea uno nuevo para guardar tu progreso.</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6 my-8">
          {users.map(user => (
            <div key={user.id} className="relative group">
              <button
                onClick={() => isManaging ? onEdit(user) : onSelect(user)}
                className={`w-full aspect-square rounded-full ${user.avatarColor} flex items-center justify-center text-white text-4xl font-bold border-4 border-transparent group-hover:border-white transition-all duration-300 transform group-hover:scale-105`}
                aria-label={isManaging ? `Editar perfil de ${user.name}` : `Seleccionar perfil de ${user.name}`}
              >
                {getInitials(user.name)}
              </button>
              {isManaging && (
                 <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                     <PencilIcon className="h-10 w-10 text-white" />
                 </div>
              )}
              <p className="mt-2 font-semibold text-gray-200 truncate">{user.name}</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Crear Nuevo Perfil</h2>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={newUserName}
              onChange={e => setNewUserName(e.target.value)}
              placeholder="Nombre del estudiante"
              className="flex-grow p-3 bg-gray-800 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Añadir
            </button>
          </form>
        </div>

        {users.length > 0 && (
          <div className="mt-8">
            <button
              onClick={onManageToggle}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors border-2 ${isManaging ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}`}
            >
              {isManaging ? 'Terminar Edición' : 'Gestionar Perfiles'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSelectionScreen;