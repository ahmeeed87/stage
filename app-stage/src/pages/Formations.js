import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import DatabaseManager from '../utils/database.js';

const Formations = () => {
  const { isDark } = useTheme();
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: '',
    price: '',
    instructor: '',
    maxParticipants: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadFormations();
  }, []);

  const loadFormations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simuler le chargement des données
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Utiliser le DatabaseManager pour charger les données
      const dbManager = new DatabaseManager();
      
      // Initialiser avec des données d'exemple si c'est la première fois
      dbManager.initializeWithSampleData();
      
      const savedFormations = dbManager.getAllFormations();
      setFormations(savedFormations);
    } catch (err) {
      console.error('Erreur lors du chargement des formations:', err);
      setError('Erreur lors du chargement des formations');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Simuler la sauvegarde
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const dbManager = new DatabaseManager();
      
      if (editingId) {
        // Modification
        const updated = dbManager.updateFormation(editingId, formData);
        if (updated) {
          setFormations(dbManager.getAllFormations());
        }
      } else {
        // Nouvelle formation
        const newFormation = dbManager.createFormation(formData);
        if (newFormation) {
          setFormations(dbManager.getAllFormations());
        }
      }
      
      resetForm();
      setShowForm(false);
      setEditingId(null);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError('Erreur lors de la sauvegarde de la formation');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (formation) => {
    setFormData({
      title: formation.title || '',
      description: formation.description || '',
      duration: formation.duration || '',
      price: formation.price || '',
      instructor: formation.instructor || '',
      maxParticipants: formation.maxParticipants || '',
      startDate: formation.startDate || '',
      endDate: formation.endDate || ''
    });
    setEditingId(formation.id);
    setShowForm(true);
  };

  const handleDelete = async (formationId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette formation ?')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Simuler la suppression
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const dbManager = new DatabaseManager();
      const success = dbManager.deleteFormation(formationId);
      
      if (success) {
        setFormations(dbManager.getAllFormations());
      }
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      setError('Erreur lors de la suppression de la formation');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      duration: '',
      price: '',
      instructor: '',
      maxParticipants: '',
      startDate: '',
      endDate: ''
    });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-4">
              Erreur
            </h2>
            <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
            <button
              onClick={loadFormations}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Gestion des formations
            </h1>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Nouvelle formation
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Chargement...</p>
            </div>
          ) : (
            <>
              {/* Statistiques */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total formations</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{formations.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                      <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">En cours</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formations.filter(f => f.status === 'En cours').length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                      <svg className="h-5 w-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Planifiées</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formations.filter(f => f.status === 'Planifié').length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                      <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Participants</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formations.reduce((sum, f) => sum + (f.currentCandidates || 0), 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Liste des formations */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Liste des formations</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {formations.map((formation) => (
                    <FormationCard 
                      key={formation.id} 
                      formation={formation}
                      onEdit={() => handleEdit(formation)}
                      onDelete={() => handleDelete(formation.id)}
                    />
                  ))}
                </div>
                {formations.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">Aucune formation trouvée</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Modal de formulaire */}
          {showForm && (
            <FormationForm
              formData={formData}
              onInputChange={handleInputChange}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingId(null);
                resetForm();
              }}
              loading={loading}
              editingId={editingId}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Composant pour la carte de formation
const FormationCard = ({ formation, onEdit, onDelete }) => (
  <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-600 transition-colors duration-200">
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {formation.title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{formation.description}</p>
      </div>
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
        {formation.status || 'Planifié'}
      </span>
    </div>

    <div className="space-y-2 mb-4">
      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Durée: {formation.duration}
      </div>
      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
        Prix: {formation.price} TND
      </div>
      {formation.instructor && (
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Instructeur: {formation.instructor}
        </div>
      )}
      {formation.maxParticipants && (
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Max: {formation.maxParticipants} participants
        </div>
      )}
    </div>

    <div className="flex space-x-2">
      <button 
        onClick={onEdit}
        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
      >
        Modifier
      </button>
      <button 
        onClick={onDelete}
        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
      >
        Supprimer
      </button>
    </div>
  </div>
);

// Composant pour le formulaire de formation
const FormationForm = ({ formData, onInputChange, onSubmit, onCancel, loading, editingId }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {editingId ? 'Modifier la formation' : 'Nouvelle formation'}
          </h3>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Titre *</label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Durée *</label>
              <input
                type="text"
                name="duration"
                required
                value={formData.duration}
                onChange={onInputChange}
                placeholder="ex: 5 jours"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Prix (TND) *</label>
              <input
                type="number"
                name="price"
                required
                value={formData.price}
                onChange={onInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Instructeur</label>
              <input
                type="text"
                name="instructor"
                value={formData.instructor}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Participants max</label>
              <input
                type="number"
                name="maxParticipants"
                value={formData.maxParticipants}
                onChange={onInputChange}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date de début</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={onInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Description de la formation..."
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Sauvegarde...' : (editingId ? 'Modifier' : 'Ajouter')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Formations; 