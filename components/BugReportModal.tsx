import React, { useState, useEffect } from 'react';
import StarIcon from './icons/StarIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import XIcon from './icons/XIcon';
import BugIcon from './icons/BugIcon';

// --- Configuración y Funciones de Ayuda para Reporte de Fallos ---

// Obtiene el dominio público de la app desde localStorage o usa un valor por defecto.
const PUBLIC_BASE =
  localStorage.getItem("app_public_url") ||
  "https://ai.studio/apps/drive/1W5brqYxDwkRak3T9S9SlR8vjkEB9PtIN";

/** Detecta si la app se está ejecutando en un visor o sandbox (Google, blob, etc.). */
function isViewer() {
  const href = window.location.href || "";
  const origin = window.location.origin || "";
  return (
    href.startsWith("blob:") ||
    origin.includes("scf.usercontent.goog") ||
    origin.includes("googleusercontent.com") ||
    origin === "null"
  );
}

/** Obtiene la ruta interna de la SPA (usando hash si existe, si no, pathname+search). */
function getRoute() {
  const { hash, pathname, search } = window.location;
  if (hash && hash.startsWith("#/")) return hash.slice(1);
  return (pathname || "/") + (search || "");
}

/** Construye URLs limpias y absolutas para incluir en el reporte. */
function getReportUrls() {
  const base = isViewer() ? PUBLIC_BASE : window.location.origin;
  const route = getRoute();
  const appUrl  = base.replace(/\/+$/, "");
  const fullUrl = appUrl + (route.startsWith("/") ? route : `/${route}`);
  return { appUrl, route, fullUrl };
}

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BugReportModal: React.FC<BugReportModalProps> = ({ isOpen, onClose }) => {
  const [details, setDetails] = useState('');
  const [rating, setRating] = useState(0);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (isOpen) {
      setDetails('');
      setRating(0);
      setStatus('idle');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim()) {
      alert("Por favor, describe el fallo que encontraste.");
      return;
    }
    setStatus('submitting');
    
    const summary = details.trim().split(' ').slice(0, 8).join(' ') + '...';

    const { fullUrl } = getReportUrls();
    const appVersion = "1.5";
    const userAgent = navigator.userAgent;
    const ratingText = rating > 0 ? `${rating} de 5 estrellas` : 'Sin valorar';
    const timestamp = new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
    
    const reportData = {
      _subject: `Reporte de fallo v1.5: ${summary}`,
      "Versión": appVersion,
      "📝 Detalles": details,
      "🌐 Página": fullUrl,
      "📸 Captura": "No se adjuntó captura",
      "💻 Navegador": userAgent,
      "⭐ Valoración": ratingText,
      "🕓 Fecha": timestamp,
    };

    try {
      const response = await fetch('https://formspree.io/f/myzdldkp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(reportData),
      });

      if (response.ok) {
        setStatus('success');
      } else {
        const responseData = await response.json().catch(() => ({}));
        console.error("Error en el envío a Formspree:", response.status, responseData);
        setStatus('error');
      }
    } catch (error) {
      console.error("Error de red al enviar el reporte:", error);
      setStatus('error');
    }
  };


  const renderContent = () => {
    switch (status) {
      case 'success':
        return (
          <div className="text-center">
            <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-100">¡Gracias!</h3>
            <p className="text-gray-300 mt-2">Tu reporte ha sido enviado. Aprecio tu ayuda para mejorar la aplicación.</p>
            <button onClick={onClose} className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
              Cerrar
            </button>
          </div>
        );
      case 'error':
        return (
          <div className="text-center">
            <XCircleIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-100">Error al Enviar</h3>
            <p className="text-gray-300 mt-2">Ocurrió un error al enviar tu reporte. Por favor, inténtalo de nuevo más tarde.</p>
            <button onClick={() => setStatus('idle')} className="mt-6 w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-colors">
              Volver a Intentar
            </button>
          </div>
        );
      default:
        return (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="bug-details" className="block text-sm font-bold mb-2 text-gray-300">Describe el problema</label>
              <textarea
                id="bug-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe el problema con el mayor detalle posible. ¿Qué estabas haciendo cuando ocurrió?"
                className="w-full h-32 p-3 bg-gray-900 border-2 border-gray-500 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-300">¿Qué te parece la app? (opcional)</label>
              <div className="flex justify-center items-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button type="button" key={star} onClick={() => setRating(star)} className="text-yellow-400 hover:text-yellow-300 transition-transform transform hover:scale-110">
                    <StarIcon filled={star <= rating} />
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={status === 'submitting'} className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50">
              {status === 'submitting' ? 'Enviando...' : 'Enviar Reporte'}
            </button>
          </form>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg p-8 shadow-2xl max-w-lg w-full border border-gray-700 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><XIcon /></button>
        <h2 className="text-2xl font-bold mb-4 text-center flex items-center justify-center gap-2">
          <BugIcon className="h-6 w-6 text-yellow-300" /> Reportar un Fallo
        </h2>
        {renderContent()}
      </div>
    </div>
  );
};

export default BugReportModal;