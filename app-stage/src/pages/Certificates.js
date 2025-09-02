import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Download, 
  User, 
  Calendar, 
  CheckCircle,
  Clock,
  X,
  Eye,
  Plus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Fonction utilitaire pour obtenir la couleur du statut
const getStatusColor = (status) => {
  switch (status) {
    case 'Généré': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'En cours': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'En attente': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }
};

const Certificates = () => {
  const { apiService } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [certificates, setCertificates] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [formations, setFormations] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedFormation, setSelectedFormation] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialiser les données depuis l'API
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Charger les données depuis l'API
      const [certificatesData, candidatesData, formationsData] = await Promise.all([
        apiService.getCertificates(),
        apiService.getCandidates(),
        apiService.getFormations()
      ]);
      
      setCertificates(certificatesData);
      setCandidates(candidatesData);
      setFormations(formationsData);
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const filteredCertificates = certificates.filter(certificate => {
    const matchesSearch = certificate.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         certificate.certificateNumber?.includes(searchTerm) ||
                         certificate.formationName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedFormation === 'all') return matchesSearch;
    
    const candidate = candidates.find(c => c.id === certificate.candidateId);
    return matchesSearch && candidate && candidate.formationId === parseInt(selectedFormation);
  });

  const generatePDF = async (certificate) => {
    setIsGeneratingPDF(true);
    try {
      // Utiliser l'API pour générer le PDF
      const pdfData = await apiService.generateCertificatePDF(certificate.id);
      
      // Pour l'instant, on simule juste le téléchargement
      const link = document.createElement('a');
      link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(
        `Certificat ${certificate.certificateNumber}\n` +
        `Candidat: ${certificate.candidateName}\n` +
        `Formation: ${certificate.formationName}\n` +
        `Date: ${certificate.issueDate}\n` +
        `Statut: ${certificate.status}`
      );
      link.download = `certificat-${certificate.certificateNumber}.txt`;
      link.click();
      
      alert('PDF généré avec succès ! (simulation)');
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Erreur lors de la génération du PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleCreateCertificate = async (formData) => {
    try {
      setLoading(true);
      setError(null);
      
      const candidate = candidates.find(c => c.id === parseInt(formData.candidateId));
      const formation = formations.find(f => f.id === parseInt(formData.formationId));
      
      if (!candidate || !formation) {
        setError('Candidat ou formation non trouvé');
        return;
      }
      
      await apiService.createCertificate({
        candidateId: parseInt(formData.candidateId),
        formationId: parseInt(formData.formationId),
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        formationName: formation.title,
        notes: formData.notes || ''
      });
      
      // Recharger les données
      await loadData();
      setShowForm(false);
      alert('Certificat créé avec succès !');
    } catch (error) {
      console.error('Erreur lors de la création du certificat:', error);
      setError('Erreur lors de la création du certificat');
    } finally {
      setLoading(false);
    }
  };

  const getCandidateName = (candidateId) => {
    const candidate = candidates.find(c => c.id === candidateId);
    return candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Candidat inconnu';
  };

  const getFormationName = (formationId) => {
    const formation = formations.find(f => f.id === formationId);
    return formation ? formation.title : 'Formation inconnue';
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
              Gestion des certificats
            </h1>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2 inline" />
              Nouveau certificat
            </button>
          </div>

          {/* Filtres */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
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

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rechercher</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Rechercher par nom, numéro ou formation..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
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
                    <FileText className="h-8 w-8 text-blue-500" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total certificats</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{certificates.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Générés</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {certificates.filter(c => c.status === 'Généré').length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                      <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">En cours</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {certificates.filter(c => c.status === 'En cours').length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                      <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Candidats</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{candidates.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Liste des certificats */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Liste des certificats</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCertificates.map((certificate) => (
                    <CertificateCard 
                      key={certificate.id} 
                      certificate={certificate}
                      onView={() => {
                        setSelectedCertificate(certificate);
                        setShowDetails(true);
                      }}
                      onGeneratePDF={() => generatePDF(certificate)}
                      isGeneratingPDF={isGeneratingPDF}
                    />
                  ))}
                </div>
                {filteredCertificates.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">Aucun certificat trouvé</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Modals */}
          {showForm && (
            <CertificateForm
              onSave={handleCreateCertificate}
              onCancel={() => setShowForm(false)}
              candidates={candidates}
              formations={formations}
            />
          )}

          {showDetails && selectedCertificate && (
            <CertificateDetailsModal
              certificate={selectedCertificate}
              onClose={() => {
                setShowDetails(false);
                setSelectedCertificate(null);
              }}
              candidateName={getCandidateName(selectedCertificate.candidateId)}
              formationName={getFormationName(selectedCertificate.formationId)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Composant pour la carte du certificat
const CertificateCard = ({ certificate, onView, onGeneratePDF, isGeneratingPDF }) => (
  <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-600 transition-colors duration-200">
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {certificate.certificateNumber}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{certificate.candidateName}</p>
      </div>
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(certificate.status)}`}>
        {certificate.status}
      </span>
    </div>

    <div className="space-y-2 mb-4">
      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
        <FileText className="h-4 w-4 mr-2" />
        {certificate.formationName}
      </div>
      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
        <Calendar className="h-4 w-4 mr-2" />
        {certificate.issueDate}
      </div>
    </div>

    <div className="flex space-x-2">
      <button 
        onClick={onView}
        className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
      >
        <Eye className="h-4 w-4 mr-1 inline" />
        Voir
      </button>
      <button 
        onClick={onGeneratePDF}
        disabled={isGeneratingPDF}
        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
      >
        {isGeneratingPDF ? (
          <Clock className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </button>
    </div>
  </div>
);

// Composant pour le formulaire de certificat
const CertificateForm = ({ onSave, onCancel, candidates, formations }) => {
  const [formData, setFormData] = useState({
    candidateId: '',
    formationId: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Nouveau certificat
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Candidat *</label>
            <select
              value={formData.candidateId}
              onChange={(e) => setFormData({...formData, candidateId: e.target.value})}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Sélectionner un candidat</option>
              {candidates.map(candidate => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.firstName} {candidate.lastName} - {candidate.cin}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Formation *</label>
            <select
              value={formData.formationId}
              onChange={(e) => setFormData({...formData, formationId: e.target.value})}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Sélectionner une formation</option>
              {formations.map(formation => (
                <option key={formation.id} value={formation.id}>
                  {formation.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Notes additionnelles..."
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Composant pour les détails du certificat
const CertificateDetailsModal = ({ certificate, onClose, candidateName, formationName }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Détails du certificat
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Informations du certificat</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Numéro</label>
                <p className="text-gray-900 dark:text-white">{certificate.certificateNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Statut</label>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(certificate.status)}`}>
                  {certificate.status}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Date de génération</label>
                <p className="text-gray-900 dark:text-white">{certificate.issueDate}</p>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Informations du candidat</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Nom complet</label>
                <p className="text-gray-900 dark:text-white">{candidateName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Formation</label>
                <p className="text-gray-900 dark:text-white">{formationName}</p>
              </div>
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

export default Certificates; 