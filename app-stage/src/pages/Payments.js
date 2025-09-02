import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const Payments = () => {
  const { isDark } = useTheme();
  const { apiService } = useAuth();
  const [payments, setPayments] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    candidateId: '',
    formationId: '',
    amount: '',
    paymentDate: '',
    paymentMethod: 'cash',
    status: 'completed',
    notes: ''
  });

  // Nouveau state pour le reste à payer
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [formationPrice, setFormationPrice] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Charger les données depuis l'API
      const [paymentsData, candidatesData, formationsData] = await Promise.all([
        apiService.getPayments(),
        apiService.getCandidates(),
        apiService.getFormations()
      ]);
      
      setPayments(paymentsData);
      setCandidates(candidatesData);
      setFormations(formationsData);
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Validation spéciale pour le montant
    if (name === 'amount') {
      // Permettre seulement les chiffres, points et virgules
      const numericValue = value.replace(/[^0-9.,]/g, '');
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Mettre à jour le reste à payer si le candidat, la formation ou le montant change
    if (name === 'candidateId' || name === 'formationId' || name === 'amount') {
      updateRemainingAmount();
    }
  };

  const updateRemainingAmount = () => {
    if (formData.candidateId && formData.formationId) {
      const candidate = candidates.find(c => c.id === parseInt(formData.candidateId));
      const formation = formations.find(f => f.id === parseInt(formData.formationId));
      
      if (candidate && formation) {
        const totalAmount = formation.price;
        
        // Calculate total paid by this candidate for this specific formation
        const candidatePayments = payments.filter(p => 
          p.candidateId === parseInt(formData.candidateId) && 
          p.formationId === parseInt(formData.formationId) &&
          p.status !== 'Annulé' // Exclude cancelled payments
        );
        
        const totalPaidForFormation = candidatePayments.reduce((sum, p) => sum + p.amount, 0);
        
        // Add the current payment amount if we're editing
        const currentPaymentAmount = editingId && formData.amount ? 
          parseFloat(formData.amount.replace(',', '.')) : 0;
        
        const totalPaid = totalPaidForFormation + currentPaymentAmount;
        const remaining = totalAmount - totalPaid;
        
        setRemainingAmount(Math.max(0, remaining));
        setFormationPrice(totalAmount);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.candidateId || !formData.formationId || !formData.amount) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const paymentData = {
        ...formData,
        amount: parseFloat(formData.amount.replace(',', '.')),
        candidateId: parseInt(formData.candidateId),
        formationId: parseInt(formData.formationId)
      };
      
      if (editingId) {
        // Modification du paiement
        await apiService.updatePayment(editingId, paymentData);
      } else {
        // Nouveau paiement
        await apiService.createPayment(paymentData);
      }
      
      // Recharger les données
      await loadData();
      
      // Réinitialiser le formulaire
      setFormData({
        candidateId: '',
        formationId: '',
        amount: '',
        paymentDate: '',
        paymentMethod: 'cash',
        status: 'completed',
        notes: ''
      });
      setEditingId(null);
      setShowForm(false);
      setRemainingAmount(0);
      setFormationPrice(0);
      
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError('Erreur lors de la sauvegarde du paiement');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (payment) => {
    setFormData({
      candidateId: payment.candidateId.toString(),
      formationId: payment.formationId.toString(),
      amount: payment.amount.toString(),
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      notes: payment.notes || ''
    });
    setEditingId(payment.id);
    setShowForm(true);
    updateRemainingAmount();
  };

  const handleDelete = async (paymentId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce paiement ?')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      await apiService.deletePayment(paymentId);
      
      // Recharger les données
      await loadData();
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      setError('Erreur lors de la suppression du paiement');
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'Payé': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'En attente': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Annulé': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  // Calculate remaining amount for a specific payment
  const getRemainingAmountForPayment = (payment) => {
    const formation = formations.find(f => f.id === payment.formationId);
    if (!formation) return 0;

    const candidatePayments = payments.filter(p => 
      p.candidateId === payment.candidateId && 
      p.formationId === payment.formationId &&
      p.status !== 'Annulé'
    );

    const totalPaid = candidatePayments.reduce((sum, p) => sum + p.amount, 0);
    return Math.max(0, formation.price - totalPaid);
  };

  // Filter payments based on search term
  const filteredPayments = payments.filter(payment => {
    if (!searchTerm) return true;
    
    const candidateName = getCandidateName(payment.candidateId).toLowerCase();
    const formationName = getFormationName(payment.formationId).toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    return candidateName.includes(searchLower) || formationName.includes(searchLower);
  });

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
              Gestion des paiements
            </h1>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Nouveau paiement
            </button>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Rechercher par nom de candidat ou formation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {searchTerm && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {filteredPayments.length} paiement(s) trouvé(s) pour "{searchTerm}"
              </p>
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
                    <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total paiements</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{payments.length}</p>
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
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Montant total</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString('fr-FR')} TND
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
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">En attente</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {payments.filter(p => p.status === 'En attente').length}
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
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Candidats</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{candidates.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Liste des paiements */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Liste des paiements</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                          Candidat
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                          Formation
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                          Montant
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                          Statut
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                          Reste à payer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredPayments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {getCandidateName(payment.candidateId)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {getFormationName(payment.formationId)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {payment.amount.toLocaleString('fr-FR')} TND
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {payment.paymentDate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {(() => {
                              const remaining = getRemainingAmountForPayment(payment);
                              return remaining > 0 ? (
                                <span className="text-orange-600 dark:text-orange-400 font-medium">
                                  {remaining.toLocaleString('fr-FR')} TND
                                </span>
                              ) : (
                                <span className="text-green-600 dark:text-green-400 font-medium">
                                  ✓ Payé
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleEdit(payment)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => handleDelete(payment.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredPayments.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400">
                        {searchTerm ? `Aucun paiement trouvé pour "${searchTerm}"` : 'Aucun paiement trouvé'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Modal de formulaire */}
          {showForm && (
            <PaymentForm
              formData={formData}
              onInputChange={handleInputChange}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingId(null);
                setFormData({
                  candidateId: '',
                  formationId: '',
                  amount: '',
                  paymentDate: '',
                  paymentMethod: 'cash',
                  status: 'completed',
                  notes: ''
                });
                setRemainingAmount(0);
                setFormationPrice(0);
              }}
              candidates={candidates}
              formations={formations}
              remainingAmount={remainingAmount}
              formationPrice={formationPrice}
              loading={loading}
              editingId={editingId}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Composant pour le formulaire de paiement
const PaymentForm = ({ 
  formData, 
  onInputChange, 
  onSubmit, 
  onCancel, 
  candidates, 
  formations, 
  remainingAmount, 
  formationPrice, 
  loading, 
  editingId 
}) => {
  const [candidateSearchTerm, setCandidateSearchTerm] = useState('');
  const [showCandidateDropdown, setShowCandidateDropdown] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCandidateDropdown && !event.target.closest('.candidate-dropdown')) {
        setShowCandidateDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCandidateDropdown]);

  // Filter candidates based on search term
  const filteredCandidates = candidates.filter(candidate => {
    if (!candidateSearchTerm) return true;
    const fullName = `${candidate.firstName} ${candidate.lastName}`.toLowerCase();
    const searchLower = candidateSearchTerm.toLowerCase();
    return fullName.includes(searchLower) || candidate.cin.toLowerCase().includes(searchLower);
  });

  // Get selected candidate name for display
  const getSelectedCandidateName = () => {
    if (!formData.candidateId) return '';
    const candidate = candidates.find(c => c.id === parseInt(formData.candidateId));
    return candidate ? `${candidate.firstName} ${candidate.lastName} - ${candidate.cin}` : '';
  };

  const handleCandidateSelect = (candidate) => {
    onInputChange({
      target: {
        name: 'candidateId',
        value: candidate.id.toString()
      }
    });
    setCandidateSearchTerm('');
    setShowCandidateDropdown(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {editingId ? 'Modifier le paiement' : 'Nouveau paiement'}
          </h3>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Candidat *</label>
              <div className="relative candidate-dropdown">
                <input
                  type="text"
                  placeholder="Rechercher un candidat..."
                  value={candidateSearchTerm || getSelectedCandidateName()}
                  onChange={(e) => {
                    setCandidateSearchTerm(e.target.value);
                    setShowCandidateDropdown(true);
                    if (!e.target.value) {
                      onInputChange({
                        target: {
                          name: 'candidateId',
                          value: ''
                        }
                      });
                    }
                  }}
                  onFocus={() => setShowCandidateDropdown(true)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {showCandidateDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCandidates.length > 0 ? (
                      filteredCandidates.map(candidate => (
                        <div
                          key={candidate.id}
                          onClick={() => handleCandidateSelect(candidate)}
                          className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-gray-900 dark:text-white"
                        >
                          <div className="font-medium">{candidate.firstName} {candidate.lastName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">CIN: {candidate.cin}</div>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500 dark:text-gray-400">
                        Aucun candidat trouvé
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Formation *</label>
              <select
                name="formationId"
                value={formData.formationId}
                onChange={onInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionner une formation</option>
                {formations.map(formation => (
                  <option key={formation.id} value={formation.id}>
                    {formation.title} - {formation.price} TND
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Montant *</label>
              <input
                type="text"
                name="amount"
                value={formData.amount}
                onChange={onInputChange}
                required
                placeholder="0,00"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date de paiement *</label>
              <input
                type="date"
                name="paymentDate"
                value={formData.paymentDate}
                onChange={onInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Méthode de paiement</label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="cash">Espèces</option>
                <option value="card">Carte bancaire</option>
                <option value="check">Chèque</option>
                <option value="transfer">Virement</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Statut</label>
              <select
                name="status"
                value={formData.status}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="completed">Payé</option>
                <option value="pending">En attente</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>
          </div>
          
          {formData.candidateId && formData.formationId && (
            <div className={`rounded-lg p-4 border ${
              remainingAmount > 0 
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' 
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                {remainingAmount > 0 ? (
                  <svg className="h-5 w-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <h4 className={`font-semibold ${
                  remainingAmount > 0 
                    ? 'text-yellow-800 dark:text-yellow-200' 
                    : 'text-green-800 dark:text-green-200'
                }`}>
                  {remainingAmount > 0 ? 'Reste à payer' : 'Formation payée intégralement'}
                </h4>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Prix total:</span>
                  <span className="ml-2 font-bold text-gray-900 dark:text-white">{formationPrice.toLocaleString('fr-FR')} TND</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Déjà payé:</span>
                  <span className="ml-2 font-bold text-gray-900 dark:text-white">
                    {(formationPrice - remainingAmount).toLocaleString('fr-FR')} TND
                  </span>
                </div>
              </div>
              
              {remainingAmount > 0 && (
                <div className="mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-700">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-yellow-800 dark:text-yellow-200">Reste à payer:</span>
                    <span className="text-lg font-bold text-yellow-900 dark:text-yellow-100">
                      {remainingAmount.toLocaleString('fr-FR')} TND
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={onInputChange}
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

export default Payments; 