// src/components/admin/UsersList.js
import React, { useState, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import LoadingIndicator from '../LoadingIndicator';
import UserDetailsModal from './UserDetailsModal';
import './Admin.css';

function UsersList() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: 'createdAt',
    direction: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  const { token } = React.useContext(AuthContext);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/admin/users`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error("Erreur lors du chargement des utilisateurs");
        }

        const data = await response.json();
        setUsers(data.users || []);
        setFilteredUsers(data.users || []);
      } catch (err) {
        console.error('Erreur de chargement des utilisateurs:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [token]);

  // Filtrer les utilisateurs en fonction du terme de recherche
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
    setCurrentPage(1); // Réinitialiser à la première page lors de la recherche
  }, [searchTerm, users]);

  // Fonction pour trier les utilisateurs
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    setFilteredUsers(prev => [...prev].sort((a, b) => {
      if (a[key] < b[key]) {
        return direction === 'asc' ? -1 : 1;
      }
      if (a[key] > b[key]) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    }));
  };

  // Fonctions de pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Fonction pour ouvrir le modal des détails utilisateur
  const openUserDetails = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  // Fonction pour fermer le modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  return (
    <div className="users-list-container">
      <div className="users-header">
        <h2>Gestion des utilisateurs</h2>
        <div className="search-container">
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {loading ? (
        <LoadingIndicator message="Chargement des utilisateurs..." />
      ) : error ? (
        <div className="admin-error">{error}</div>
      ) : (
        <>
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th onClick={() => requestSort('id')}>
                    ID 
                    {sortConfig.key === 'id' && (
                      <span className="sort-icon">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </th>
                  <th onClick={() => requestSort('name')}>
                    Nom 
                    {sortConfig.key === 'name' && (
                      <span className="sort-icon">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </th>
                  <th onClick={() => requestSort('email')}>
                    Email 
                    {sortConfig.key === 'email' && (
                      <span className="sort-icon">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </th>
                  <th onClick={() => requestSort('role')}>
                    Rôle 
                    {sortConfig.key === 'role' && (
                      <span className="sort-icon">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </th>
                  <th onClick={() => requestSort('subscription')}>
                    Abonnement 
                    {sortConfig.key === 'subscription' && (
                      <span className="sort-icon">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </th>
                  <th onClick={() => requestSort('createdAt')}>
                    Date d'inscription 
                    {sortConfig.key === 'createdAt' && (
                      <span className="sort-icon">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-results">Aucun utilisateur trouvé</td>
                  </tr>
                ) : (
                  currentItems.map(user => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`user-role ${user.role}`}>
                          {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                        </span>
                      </td>
                      <td>
                        <span className={`subscription-status ${user.subscription || 'free'}`}>
                          {user.subscription ? user.subscription : 'Gratuit'}
                        </span>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="action-button view"
                            onClick={() => openUserDetails(user)}
                          >
                            Détails
                          </button>
                          <button 
                            className="action-button edit"
                            onClick={() => openUserDetails(user)}
                          >
                            Éditer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredUsers.length > itemsPerPage && (
            <div className="pagination">
              <button 
                onClick={() => paginate(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="pagination-button"
              >
                &laquo; Précédent
              </button>
              <div className="pagination-info">
                Page {currentPage} sur {totalPages}
              </div>
              <button 
                onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="pagination-button"
              >
                Suivant &raquo;
              </button>
            </div>
          )}
          
          {/* Modal des détails utilisateur */}
          {showModal && (
            <UserDetailsModal 
              user={selectedUser} 
              onClose={closeModal}
              token={token}
            />
          )}
        </>
      )}
    </div>
  );
}

export default UsersList;