import React from 'react';
import { Clock, AlertTriangle, RefreshCw } from 'lucide-react';

const RateLimitHandler = ({ error, onRetry, retryAfter }) => {
  const isRateLimitError = error && error.status === 429;
  
  if (!isRateLimitError) {
    return null;
  }

  const formatRetryTime = (seconds) => {
    if (seconds < 60) {
      return `${seconds} secondes`;
    } else if (seconds < 3600) {
      const minutes = Math.ceil(seconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      const hours = Math.ceil(seconds / 3600);
      return `${hours} heure${hours > 1 ? 's' : ''}`;
    }
  };

  const retryTime = retryAfter ? formatRetryTime(retryAfter) : 'quelques secondes';

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            Trop de requêtes
          </h3>
          <p className="text-yellow-700 dark:text-yellow-300 mb-4">
            Vous avez effectué trop de requêtes en peu de temps. 
            Veuillez attendre {retryTime} avant de réessayer.
          </p>
          
          <div className="flex items-center space-x-2 text-sm text-yellow-600 dark:text-yellow-400 mb-4">
            <Clock className="h-4 w-4" />
            <span>Prochain essai possible dans {retryTime}</span>
          </div>

          {onRetry && (
            <button
              onClick={onRetry}
              disabled={retryAfter > 0}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                retryAfter > 0
                  ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-800 dark:text-yellow-400 cursor-not-allowed'
                  : 'bg-yellow-600 text-white hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600'
              }`}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${retryAfter > 0 ? '' : 'animate-spin'}`} />
              {retryAfter > 0 ? 'Attendez...' : 'Réessayer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RateLimitHandler;
