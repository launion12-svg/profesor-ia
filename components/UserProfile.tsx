import React from 'react';
import type { User } from '../types';
import LogoutIcon from './icons/LogoutIcon';
import { getInitials } from '../utils';

interface UserProfileProps {
  user: User;
  onLogout: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onLogout }) => {
  return (
    <div className="w-full flex flex-col items-center bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-8 animate-fade-in">
      <div className={`w-20 h-20 rounded-full mb-4 border-2 border-indigo-400 ${user.avatarColor} flex items-center justify-center`}>
        <span className="text-3xl font-bold text-white">{getInitials(user.name)}</span>
      </div>
      <h2 className="text-2xl font-bold text-gray-100">¡Hola, {user.name.split(' ')[0]}!</h2>
      <p className="text-gray-400 mb-4">Tu progreso se guardará en tu cuenta.</p>
      <button
        onClick={onLogout}
        className="flex items-center justify-center bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
      >
        <LogoutIcon />
        <span className="ml-2">Cerrar Sesión</span>
      </button>
    </div>
  );
};

export default UserProfile;