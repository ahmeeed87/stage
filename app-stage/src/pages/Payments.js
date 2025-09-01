import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import DatabaseManager from '../utils/database';

const Payments = () => {
  const { isDark } = useTheme();
  const [payments, setPayments] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
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
      
      // Simuler le chargement des données
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Utiliser le DatabaseManager pour charger les données
      const dbManager = new DatabaseManager();
      
      // Initialiser avec des données d'exemple si c'est la première fois
      dbManager.initializeWithSampleData();
      
      const savedPayments = dbManager.getAllPayments();
      const savedCandidates = dbManager.getAllCandidates();
      const savedFormations = dbManager.getAllFormations();
      
      setPayments(savedPayments);
      setCandidates(savedCandidates);
      setFormations(savedFormations);
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
    
    // Mettre à jour le reste à payer si le candidat ou la formation change
    if (name === 'candidateId' || name === 'formationId') {
      updateRemainingAmount();
    }
  };

  const updateRemainingAmount = () => {
    if (formData.candidateId && formData.formationId) {
      const candidate = candidates.find(c => c.id === parseInt(formData.candidateId));
      const formation = formations.find(f => f.id === parseInt(formData.formationId));
      
      if (candidate && formation) {
        const totalAmount = formation.price;
        const paidAmount = candidate.totalPaid || 0;
        const remaining = totalAmount - paidAmount;
        
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
      
      const dbManager = new DatabaseManager();
      
      if (editingId) {
        // Modification du paiement
        const updatedPayment = { ...formData, id: editingId };
        // Note: updatePayment method would need to be implemented in DatabaseManager
        setPayments(prev => prev.map(p => p.id === editingId ? updatedPayment : p));
      } else {
        // Nouveau paiement
        const newPayment = dbManager.createPayment({
          ...formData,
          amount: parseFloat(formData.amount.replace(',', '.')),
          candidateId: parseInt(formData.candidateId),
          formationId: parseInt(formData.formationId)
        });
        
        if (newPayment) {
          setPayments(prev => [...prev, newPayment]);
          // Mettre à jour la liste des candidats
          setCandidates(dbManager.getAllCandidates());
        }
      }
      
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
      
      const dbManager = new DatabaseManager();
      const success = dbManager.deletePayment(paymentId);
      
      if (success) {
        // Recharger les données depuis la base
        const updatedPayments = dbManager.getAllPayments();
        const updatedCandidates = dbManager.getAllCandidates();
        setPayments(updatedPayments);
        setCandidates(updatedCandidates);
      } else {
        setError('Erreur lors de la suppression du paiement');
      }
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
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {payments.map((payment) => (
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
                  {payments.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400">Aucun paiement trouvé</p>
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
              <select
                name="candidateId"
                value={formData.candidateId}
                onChange={onInputChange}
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
          
          {remainingAmount > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Prix de la formation:</strong> {formationPrice} TND<br />
                <strong>Reste à payer:</strong> {remainingAmount} TND
              </p>
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