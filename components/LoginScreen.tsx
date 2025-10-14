
import React, { useState } from 'react';
import { signUp, signIn } from '../services/authService';
import AcademicCapIcon from './icons/AcademicCapIcon';

interface LoginScreenProps {
  isFirebaseReady: boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ isFirebaseReady }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFirebaseReady) return;

    setIsLoading(true);
    setError(null);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, name);
      }
    } catch (err: any) {
      console.error("Error de autenticación:", err); // For debugging
      let message = 'Ocurrió un error. Inténtalo de nuevo.';
      if (err.code) {
        switch (err.code) {
          case 'auth/invalid-email':
            message = 'El formato del email no es válido.';
            break;
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            message = 'Email o contraseña incorrectos.';
            break;
          case 'auth/email-already-in-use':
            message = 'Este email ya está registrado. Por favor, inicia sesión.';
            break;
          case 'auth/weak-password':
            message = 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.';
            break;
          case 'auth/operation-not-allowed':
            message = 'La autenticación por email y contraseña no está habilitada. Contacta al administrador.';
            break;
          case 'auth/network-request-failed':
            message = 'Error de red. Por favor, revisa tu conexión a internet.';
            break;
        }
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 animate-fade-in">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            <div className="inline-block p-4 bg-gray-800 rounded-full">
               <AcademicCapIcon />
            </div>
            <h1 className="text-3xl font-extrabold mt-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
                Asistente de Estudio IA
            </h1>
            <p className="text-gray-400">Inicia sesión o crea una cuenta para empezar.</p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 shadow-2xl">
          {!isFirebaseReady && (
            <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg mb-6 text-sm text-center">
              <p className="font-bold">Error de Configuración de Firebase</p>
              <p className="mt-1">
                La autenticación no está disponible. Por favor, revisa que todas tus claves de Firebase sean correctas en el panel de configuración (icono de engranaje ⚙️).
              </p>
            </div>
          )}

          <div className="flex border-b border-gray-700 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 font-semibold transition-colors ${isLogin ? 'text-white border-b-2 border-indigo-500' : 'text-gray-400'}`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 font-semibold transition-colors ${!isLogin ? 'text-white border-b-2 border-indigo-500' : 'text-gray-400'}`}
            >
              Crear Cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300">Nombre</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={!isFirebaseReady || isLoading}
                  className="mt-1 w-full p-3 bg-gray-800 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">Nombre de cuenta (Email)</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={!isFirebaseReady || isLoading}
                className="mt-1 w-full p-3 bg-gray-800 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">Contraseña</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isLogin ? "current-password" : "new-password"}
                disabled={!isFirebaseReady || isLoading}
                className="mt-1 w-full p-3 bg-gray-800 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
              />
            </div>
            
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            
            <button
              type="submit"
              disabled={!isFirebaseReady || isLoading}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50"
            >
              {isLoading ? 'Cargando...' : isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
