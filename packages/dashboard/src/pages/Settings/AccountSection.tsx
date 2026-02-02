import { useState } from 'react';
import { User, Eye, EyeOff, LogOut, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Modal, Button } from '@foodtruck/shared/components';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ErrorAlert } from '../../components/Alert';

export function AccountSection() {
  const { user, updatePasswordWithOld, signOut } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!oldPassword) {
      setError('Veuillez entrer votre mot de passe actuel');
      return;
    }

    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    if (oldPassword === newPassword) {
      setError("Le nouveau mot de passe doit être différent de l'ancien");
      return;
    }

    setLoading(true);
    const { error: updateError } = await updatePasswordWithOld(oldPassword, newPassword);
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      setShowPasswordForm(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(false);
    }, 2000);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'SUPPRIMER') {
      setDeleteError('Veuillez taper SUPPRIMER pour confirmer');
      return;
    }

    setDeleting(true);
    setDeleteError('');
    try {
      // Call Edge Function to delete account and all associated data
      const { error: deleteAccountError } = await supabase.functions.invoke('delete-account');

      if (deleteAccountError) {
        throw deleteAccountError;
      }

      await signOut();
    } catch {
      setDeleteError('Erreur lors de la suppression du compte');
    }
    setDeleting(false);
  };

  return (
    <section className="card p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <User className="w-6 h-6 text-primary-500" />
        <h2 className="text-lg font-semibold text-gray-900">Compte</h2>
      </div>

      <div className="space-y-4">
        {/* Email (read-only) */}
        <div className="py-3 border-b border-gray-100">
          <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
          <p className="text-gray-900">{user?.email || '-'}</p>
        </div>

        {/* Password */}
        <div className="py-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Mot de passe</label>
              <p className="text-gray-900">••••••••</p>
            </div>
            {!showPasswordForm && (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Modifier
              </button>
            )}
          </div>

          {showPasswordForm && (
            <form onSubmit={handlePasswordChange} className="mt-4 space-y-3">
              {success ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Mot de passe modifié avec succès</span>
                </div>
              ) : (
                <>
                  <div>
                    <label className="label text-xs">Mot de passe actuel</label>
                    <div className="relative">
                      <input
                        type={showOldPassword ? 'text' : 'password'}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="input min-h-[44px] pr-12"
                        placeholder="Votre mot de passe actuel"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-gray-400 hover:text-gray-600"
                      >
                        {showOldPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="label text-xs">Nouveau mot de passe</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="input min-h-[44px] pr-12"
                        placeholder="Minimum 6 caractères"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="label text-xs">Confirmer le nouveau mot de passe</label>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input min-h-[44px]"
                      placeholder="Répétez le nouveau mot de passe"
                    />
                  </div>

                  {error && <ErrorAlert>{error}</ErrorAlert>}

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setOldPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                        setError('');
                      }}
                      className="btn-secondary min-h-[44px] flex-1"
                      disabled={loading}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="btn-primary min-h-[44px] flex-1"
                      disabled={loading || !oldPassword || !newPassword || !confirmPassword}
                    >
                      {loading ? 'Vérification...' : 'Enregistrer'}
                    </button>
                  </div>
                </>
              )}
            </form>
          )}
        </div>

        {/* Sign out */}
        <div className="pt-2 flex items-center justify-between">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium text-sm min-h-[44px] active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </button>
        </div>

        {/* Delete account */}
        <div className="pt-4 mt-4 border-t border-gray-200">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 text-gray-400 hover:text-red-600 text-sm transition-colors min-h-[44px] active:scale-[0.98]"
          >
            <Trash2 className="w-4 h-4" />
            Supprimer mon compte
          </button>
        </div>
      </div>

      {/* Delete Account Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirmText('');
          setDeleteError('');
        }}
        title="Supprimer le compte"
        size="sm"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Action irréversible</p>
              <p className="text-sm text-red-600">
                Toutes vos données seront définitivement supprimées.
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4">Cette action supprimera définitivement :</p>
          <ul className="text-sm text-gray-600 mb-4 list-disc list-inside space-y-1">
            <li>Votre profil et paramètres</li>
            <li>Votre menu et catégories</li>
            <li>Vos emplacements et planning</li>
            <li>Votre historique de commandes</li>
            <li>Vos clients et campagnes</li>
          </ul>

          <p className="text-sm text-gray-600 mb-2">
            Pour confirmer, tapez <strong>SUPPRIMER</strong> ci-dessous :
          </p>
          <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="SUPPRIMER"
            className="input min-h-[44px] mb-4"
          />

          {deleteError && <ErrorAlert className="mb-4">{deleteError}</ErrorAlert>}

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmText('');
                setDeleteError('');
              }}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== 'SUPPRIMER' || deleting}
              className="flex-1 !bg-red-600 hover:!bg-red-700"
            >
              {deleting ? 'Suppression...' : 'Supprimer'}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
