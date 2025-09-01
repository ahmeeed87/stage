import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  BookOpen
} from 'lucide-react';
import DatabaseManager from '../utils/database.js';

const Candidates = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [formations, setFormations] = useState([]);
  const [selectedFormation, setSelectedFormation] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialiser les données depuis DatabaseManager
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simuler le chargement des données
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Utiliser le DatabaseManager pour charger les données
      const dbManager = new DatabaseManager();
      
      // Initialiser avec des données d'exemple si c'est la première fois
      dbManager.initializeWithSampleData();
      
      const savedCandidates = dbManager.getAllCandidates();
      const savedFormations = dbManager.getAllFormations();
      
      setCandidates(savedCandidates);
      setFormations(savedFormations);
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = candidate.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         candidate.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         candidate.cin.includes(searchTerm) ||
                         candidate.phone.includes(searchTerm) ||
                         (candidate.phone2 && candidate.phone2.includes(searchTerm));
    
    const matchesFormation = selectedFormation === 'all' || candidate.formationId === parseInt(selectedFormation);
    
    // Date filtering
    let matchesDate = true;
    if (startDate && candidate.registrationDate < startDate) {
      matchesDate = false;
    }
    if (endDate && candidate.registrationDate > endDate) {
      matchesDate = false;
    }
    
    return matchesSearch && matchesFormation && matchesDate;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Actif': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'En attente': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Inactif': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'En attente de paiement': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getFormationName = (formationId) => {
    const formation = formations.find(f => f.id === formationId);
    return formation ? formation.title : 'Non assignée';
  };

  const handleSaveCandidate = async (data) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simuler la sauvegarde
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const dbManager = new DatabaseManager();
      
      if (editingCandidate) {
        // Modification
        const updated = dbManager.updateCandidate(editingCandidate.id, data);
        if (updated) {
          setCandidates(dbManager.getAllCandidates());
        }
      } else {
        // Ajout
        const newCandidate = dbManager.createCandidate(data);
        setCandidates(dbManager.getAllCandidates());
      }
      
      setShowForm(false);
      setEditingCandidate(null);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError('Erreur lors de la sauvegarde du candidat');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCandidate = async (candidateId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce candidat ?')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Simuler la suppression
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const dbManager = new DatabaseManager();
      const success = dbManager.deleteCandidate(candidateId);
      
      if (success) {
        setCandidates(dbManager.getAllCandidates());
      }
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      setError('Erreur lors de la suppression du candidat');
    } finally {
      setLoading(false);
    }
  };

  const markAsNotPaid = async (candidateId) => {
    try {
      setLoading(true);
      setError(null);
      
      const dbManager = new DatabaseManager();
      const updated = dbManager.updateCandidate(candidateId, { status: 'En attente de paiement' });
      
      if (updated) {
        setCandidates(dbManager.getAllCandidates());
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      setError('Erreur lors de la mise à jour du statut');
    } finally {
      setLoading(false);
    }
  };

  const clearDateFilters = () => {
    setStartDate('');
    setEndDate('');
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
              onClick={loadData}
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
              Gestion des candidats
            </h1>
            <div className="flex space-x-3">
              <button 
                onClick={() => {
                  setEditingCandidate(null);
                  setShowForm(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2 inline" />
                Nouveau candidat
              </button>
            </div>
          </div>

          {/* Filtres */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Formation</label>
                <select
                  value={selectedFormation}
                  onChange={(e) => setSelectedFormation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Toutes les formations</option>
                  {formations.map(formation => (
                    <option key={formation.id} value={formation.id}>
                      {formation.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date d'inscription (début)</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date d'inscription (fin)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rechercher</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Rechercher par nom, email, CIN ou téléphone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            
            {/* Bouton pour effacer les filtres de date */}
            {(startDate || endDate) && (
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Filtres actifs:</span>
                  {startDate && <span className="ml-2">À partir du {startDate}</span>}
                  {endDate && <span className="ml-2">Jusqu'au {endDate}</span>}
                </div>
                <button
                  onClick={clearDateFilters}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                >
                  Effacer les filtres de date
                </button>
              </div>
            )}
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
                    <Users className="h-8 w-8 text-blue-500" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total candidats</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{candidates.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Actifs</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {candidates.filter(c => c.status === 'Actif').length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">En attente</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {candidates.filter(c => c.status === 'En attente').length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center">
                    <CreditCard className="h-8 w-8 text-purple-500" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Paiements en retard</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {candidates.filter(c => c.remainingAmount > 0).length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Liste des candidats */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Liste des candidats</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCandidates.map((candidate) => (
                    <CandidateCard 
                      key={candidate.id} 
                      candidate={candidate}
                      onEdit={() => {
                        setEditingCandidate(candidate);
                        setShowForm(true);
                      }}
                      onDelete={() => handleDeleteCandidate(candidate.id)}
                      onView={() => {
                        setSelectedCandidate(candidate);
                        setShowDetails(true);
                      }}
                      onMarkNotPaid={() => markAsNotPaid(candidate.id)}
                    />
                  ))}
                </div>
                {filteredCandidates.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">Aucun candidat trouvé</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Modals */}
          {showForm && (
            <CandidateForm
              candidate={editingCandidate}
              onSave={handleSaveCandidate}
              onCancel={() => {
                setShowForm(false);
                setEditingCandidate(null);
              }}
              formations={formations}
              loading={loading}
            />
          )}

          {showDetails && selectedCandidate && (
            <CandidateDetailsModal
              candidate={selectedCandidate}
              onClose={() => {
                setShowDetails(false);
                setSelectedCandidate(null);
              }}
              formationName={getFormationName(selectedCandidate.formationId)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Composant pour la carte du candidat
const CandidateCard = ({ candidate, onEdit, onDelete, onView, onMarkNotPaid }) => (
  <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-600 transition-colors duration-200">
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {candidate.firstName} {candidate.lastName}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">CIN: {candidate.cin}</p>
      </div>
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(candidate.status)}`}>
        {candidate.status}
      </span>
    </div>

    <div className="space-y-2 mb-4">
      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
        <Phone className="h-4 w-4 mr-2" />
        {candidate.phone}
      </div>
      {candidate.phone2 && (
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
          <Phone className="h-4 w-4 mr-2" />
          {candidate.phone2}
        </div>
      )}
      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
        <Mail className="h-4 w-4 mr-2" />
        {candidate.email}
      </div>
      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
        <MapPin className="h-4 w-4 mr-2" />
        {candidate.address}
      </div>
      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
        <Calendar className="h-4 w-4 mr-2" />
        Inscrit le {candidate.registrationDate}
      </div>
    </div>

    {candidate.formationId && (
      <div className="border-t border-gray-200 dark:border-gray-500 pt-4 mb-4">
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mb-2">
          <BookOpen className="h-4 w-4 mr-2" />
          Formation: {candidate.formationId ? 'Formation assignée' : 'Non assignée'}
        </div>
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
          <CreditCard className="h-4 w-4 mr-2" />
          Paiement: {candidate.totalPaid} TND / {candidate.totalPaid + candidate.remainingAmount} TND
        </div>
        {candidate.remainingAmount > 0 && (
          <div className="mt-2">
            <span className="text-sm text-red-600 dark:text-red-400 font-medium">
              Reste à payer: {candidate.remainingAmount} TND
            </span>
          </div>
        )}
      </div>
    )}

    <div className="flex space-x-2">
      <button 
        onClick={onView}
        className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
      >
        <Eye className="h-4 w-4 mr-1 inline" />
        Voir
      </button>
      <button 
        onClick={onEdit}
        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
      >
        <Edit className="h-4 w-4 mr-1 inline" />
        Modifier
      </button>
      {candidate.remainingAmount > 0 && (
        <button 
          onClick={onMarkNotPaid}
          className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
          title="Marquer comme non payé"
        >
          <CreditCard className="h-4 w-4" />
        </button>
      )}
      <button 
        onClick={onDelete}
        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  </div>
);

// Composant pour le formulaire
const CandidateForm = ({ candidate, onSave, onCancel, formations, loading }) => {
  const [formData, setFormData] = useState(candidate || {
    firstName: '',
    lastName: '',
    cin: '',
    phone: '',
    phone2: '',
    email: '',
    address: '',
    birthDate: '',
    formationId: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {candidate ? 'Modifier le candidat' : 'Nouveau candidat'}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Prénom *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nom *</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">CIN *</label>
              <input
                type="text"
                required
                value={formData.cin}
                onChange={(e) => setFormData({...formData, cin: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Téléphone *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Téléphone 2</label>
              <input
                type="tel"
                value={formData.phone2}
                onChange={(e) => setFormData({...formData, phone2: e.target.value})}
                placeholder="Optionnel"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date de naissance *</label>
              <input
                type="date"
                required
                value={formData.birthDate}
                onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Formation</label>
              <select
                value={formData.formationId || ''}
                onChange={(e) => setFormData({...formData, formationId: e.target.value ? parseInt(e.target.value) : null})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Aucune formation</option>
                {formations.map(formation => (
                  <option key={formation.id} value={formation.id}>
                    {formation.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Adresse</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {loading ? 'Sauvegarde...' : (candidate ? 'Modifier' : 'Ajouter')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Composant pour les détails du candidat
const CandidateDetailsModal = ({ candidate, onClose, formationName }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Détails du candidat
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Informations personnelles</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Nom complet</label>
                <p className="text-gray-900 dark:text-white">{candidate.firstName} {candidate.lastName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">CIN</label>
                <p className="text-gray-900 dark:text-white">{candidate.cin}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Téléphone</label>
                <p className="text-gray-900 dark:text-white">{candidate.phone}</p>
              </div>
              {candidate.phone2 && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Téléphone 2</label>
                  <p className="text-gray-900 dark:text-white">{candidate.phone2}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                <p className="text-gray-900 dark:text-white">{candidate.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Adresse</label>
                <p className="text-gray-900 dark:text-white">{candidate.address}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Date de naissance</label>
                <p className="text-gray-900 dark:text-white">{candidate.birthDate}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Date d'inscription</label>
                <p className="text-gray-900 dark:text-white">{candidate.registrationDate}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Statut</label>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(candidate.status)}`}>
                  {candidate.status}
                </span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Formation et paiements</h3>
            <div className="space-y-3">
              {candidate.formationId ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Formation</label>
                    <p className="text-gray-900 dark:text-white">{formationName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Montant total</label>
                    <p className="text-gray-900 dark:text-white">{candidate.totalPaid + candidate.remainingAmount} TND</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Montant payé</label>
                    <p className="text-green-600 dark:text-green-400 font-medium">{candidate.totalPaid} TND</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Reste à payer</label>
                    <p className="text-red-600 dark:text-red-400 font-medium">{candidate.remainingAmount} TND</p>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">Aucune formation assignée</p>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Fermer
        </button>
      </div>
    </div>
  </div>
);

// Fonction helper pour les couleurs de statut
const getStatusColor = (status) => {
  switch (status) {
    case 'Actif': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'En attente': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'Inactif': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'En attente de paiement': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }
};

export default Candidates; 