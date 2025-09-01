import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Calendar,
  User,
  CreditCard,
  BookOpen,
  X
} from 'lucide-react';
import DatabaseManager from '../utils/database';

const Notifications = () => {
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = () => {
    const dbManager = new DatabaseManager();
    
    // Initialiser avec des données d'exemple si c'est la première fois
    dbManager.initializeWithSampleData();
    
    let allNotifications = dbManager.getAllNotifications();

    // Si pas de notifications, en générer quelques-unes basées sur les données
    if (allNotifications.length === 0) {
      const candidates = dbManager.getAllCandidates();
      const formations = dbManager.getAllFormations();
      
      allNotifications = [];
      
      // Notifications de paiement en retard
      candidates.forEach(candidate => {
        if (candidate.remainingAmount > 0) {
          allNotifications.push({
            id: allNotifications.length + 1,
            type: "payment_reminder",
            title: "Rappel de paiement",
            message: `Le candidat ${candidate.firstName} ${candidate.lastName} a un retard de paiement de ${candidate.remainingAmount.toLocaleString()} TND`,
            candidateId: candidate.id,
            date: new Date().toISOString().split('T')[0],
            status: "Non lu",
            priority: "high"
          });
        }
      });

      // Notifications de début de formation
      formations.forEach(formation => {
        if (formation.status === 'Planifié' && formation.startDate) {
          const startDate = new Date(formation.startDate);
          const today = new Date();
          const daysUntilStart = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
          
          if (daysUntilStart <= 7 && daysUntilStart > 0) {
            allNotifications.push({
              id: allNotifications.length + 1,
              type: "formation_start",
              title: "Début de formation",
              message: `La formation ${formation.title} commence dans ${daysUntilStart} jour(s)`,
              formationId: formation.id,
              date: new Date().toISOString().split('T')[0],
              status: "Non lu",
              priority: "medium"
            });
          }
        }
      });

      // Notifications de bienvenue
      if (allNotifications.length === 0) {
        allNotifications.push({
          id: 1,
          type: "welcome",
          title: "Bienvenue",
          message: "Bienvenue dans votre centre de formation. Commencez par ajouter vos premiers candidats et formations.",
          date: new Date().toISOString().split('T')[0],
          status: "Non lu",
          priority: "low"
        });
      }

      // Sauvegarder les notifications générées via DatabaseManager
      const dbManager = new DatabaseManager();
      dbManager.saveNotifications(allNotifications);
    }

    setNotifications(allNotifications);
  };

  const markAsRead = (id) => {
    const dbManager = new DatabaseManager();
    const updated = dbManager.markNotificationAsRead(id);
    
    if (updated) {
      setNotifications(dbManager.getAllNotifications());
    }
  };

  const markAllAsRead = () => {
    const dbManager = new DatabaseManager();
    notifications.forEach(notification => {
      if (notification.status === 'Non lu') {
        dbManager.markNotificationAsRead(notification.id);
      }
    });
    setNotifications(dbManager.getAllNotifications());
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 dark:text-red-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case 'medium': return <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      case 'low': return <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      default: return <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'payment_reminder': return <CreditCard className="h-5 w-5" />;
      case 'formation_start': return <BookOpen className="h-5 w-5" />;
      case 'welcome': return <User className="h-5 w-5" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : filter === 'unread' 
    ? notifications.filter(n => n.status === 'Non lu')
    : notifications.filter(n => n.type === filter);

  const unreadCount = notifications.filter(n => n.status === 'Non lu').length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Notifications
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Gérez vos notifications et alertes
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Tout marquer comme lu
                </button>
              )}
              <div className="relative">
                <Bell className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Filtres */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500'
                }`}
              >
                Toutes ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'unread'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500'
                }`}
              >
                Non lues ({unreadCount})
              </button>
              <button
                onClick={() => setFilter('payment_reminder')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'payment_reminder'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500'
                }`}
              >
                Rappels de paiement
              </button>
              <button
                onClick={() => setFilter('formation_start')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'formation_start'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500'
                }`}
              >
                Débuts de formation
              </button>
            </div>
          </div>

          {/* Liste des notifications */}
          <div className="space-y-4">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Aucune notification</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {filter === 'all' ? 'Vous n\'avez pas encore de notifications' : 'Aucune notification pour ce filtre'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  getPriorityColor={getPriorityColor}
                  getPriorityIcon={getPriorityIcon}
                  getTypeIcon={getTypeIcon}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Composant pour la carte de notification
const NotificationCard = ({ notification, onMarkAsRead, getPriorityColor, getPriorityIcon, getTypeIcon }) => (
  <div className={`bg-white dark:bg-gray-700 rounded-lg shadow p-4 border-l-4 transition-colors duration-200 ${
    notification.status === 'Non lu' 
      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
      : 'border-gray-300 dark:border-gray-600'
  }`}>
    <div className="flex items-start justify-between">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {getTypeIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              {notification.title}
            </h3>
            {getPriorityIcon(notification.priority)}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            {notification.message}
          </p>
          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              {notification.date}
            </div>
            <span className={`font-medium ${getPriorityColor(notification.priority)}`}>
              {notification.priority === 'high' ? 'Élevée' : 
               notification.priority === 'medium' ? 'Moyenne' : 'Faible'}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {notification.status === 'Non lu' && (
          <button
            onClick={() => onMarkAsRead(notification.id)}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <CheckCircle className="h-4 w-4" />
          </button>
        )}
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          notification.status === 'Non lu'
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
        }`}>
          {notification.status === 'Non lu' ? 'Non lu' : 'Lu'}
        </span>
      </div>
    </div>
  </div>
);

export default Notifications; 