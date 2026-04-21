import React, { useState, useEffect } from 'react';
import LeaveStatusDot from './LeaveStatusDot';

const OrganizationHierarchy = ({ user, onClose }) => {
  const [hierarchy, setHierarchy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [scale, setScale] = useState(1);
  const [userWithLevel, setUserWithLevel] = useState(user);
  const CARD_WIDTH = 260;
  const CHILD_VERTICAL_GAP = 40;

  useEffect(() => {
    const fetchData = async () => {
      if (user?.id) {
        // Fetch complete user data with level
        try {
          const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/${user.id}`);
          const completeUser = await response.json();
          setUserWithLevel(completeUser);
        } catch (err) {
          console.error('Error fetching user data:', err);
          setUserWithLevel(user);
        }
        
        fetchHierarchy();
      }
    };
    
    fetchData();
  }, [user]);

  useEffect(() => {
    const fetchUserLevel = async () => {
      if (user?.id && !user.level) {
        try {
          const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/${user.id}`);
          const userData = await response.json();
          if (userData.level) {
            // Update the user object with level
            user.level = userData.level;
          }
        } catch (err) {
          console.error('Error fetching user level:', err);
        }
      }
    };
    fetchUserLevel();
  }, [user]);

  const fetchHierarchy = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch all users
      const usersRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/`);
      const allUsers = await usersRes.json();

      // Build the hierarchy tree
      const tree = buildHierarchyTree(allUsers, user.id);
      setHierarchy(tree);

      // Auto-expand the path to current user
      const pathNodes = new Set();
      findPathToUser(tree, user.id, pathNodes);
      setExpandedNodes(pathNodes);

    } catch (err) {
      console.error('Error fetching hierarchy:', err);
      setError('Failed to load organizational hierarchy');
    } finally {
      setLoading(false);
    }
  };

  const buildHierarchyTree = (users, currentUserId) => {
    // Filter out system admin from the hierarchy (but keep CEO even if they're Admin)
    const filteredUsers = users.filter(u => {
      if (u.role === 'Admin' && !u.designation?.toLowerCase().includes('ceo')) {
        return false; // Exclude non-CEO admins
      }
      return true;
    });

    // Create a map of users by ID and email for quick lookup
    const userMapById = new Map();
    const userMapByEmail = new Map();

    filteredUsers.forEach(u => {
      const userNode = { 
        ...u, 
        children: [], 
        isCurrentUser: String(u._id) === String(currentUserId) || String(u.id) === String(currentUserId)
      };
      userMapById.set(u._id, userNode);
      userMapByEmail.set(u.email.toLowerCase(), userNode);
    });

    // Build parent-child relationships
    filteredUsers.forEach(u => {
      if (u.reportsToEmail && 
          u.reportsToEmail !== '' && 
          u.reportsToEmail.toLowerCase() !== u.email.toLowerCase()) {
      
        const managerEmail = u.reportsToEmail.toLowerCase();
        const manager = userMapByEmail.get(managerEmail);
        const employee = userMapByEmail.get(u.email.toLowerCase()) || userMapById.get(u._id);
      
        if (manager && employee && manager._id !== employee._id) {
          if (!manager.children.find(c => c._id === employee._id)) {
            manager.children.push(employee);
          }
        } else if (!manager) {
          console.warn(`⚠️ Manager with email ${u.reportsToEmail} not found for employee ${u.name}`);
        }
      }
    });

    // Find CEO
    let ceo = Array.from(userMapById.values()).find(u => 
      u.designation?.toLowerCase().includes('ceo')
    );

    if (!ceo) {
      const topLevel = Array.from(userMapById.values()).filter(u => {
        const hasNoManager = !u.reportsToEmail || 
                            u.reportsToEmail === '' || 
                            u.reportsToEmail.toLowerCase() === u.email.toLowerCase();
        return hasNoManager;
      });
      
      if (topLevel.length === 1) {
        ceo = topLevel[0];
      } else if (topLevel.length > 1) {
        ceo = {
          name: 'Organization',
          email: 'root',
          designation: 'Executive Leadership',
          role: 'System',
          children: topLevel,
          isVirtual: true,
          _id: 'virtual-root'
        };
      }
    }

    // Handle orphans
    const findOrphans = () => {
      const allChildrenIds = new Set();
      const collectChildIds = (node) => {
        if (node.children) {
          node.children.forEach(child => {
            allChildrenIds.add(child._id);
            collectChildIds(child);
          });
        }
      };
      
      if (ceo) {
        allChildrenIds.add(ceo._id);
        collectChildIds(ceo);
      }
      
      return Array.from(userMapById.values()).filter(u => 
        !allChildrenIds.has(u._id)
      );
    };

    const orphans = findOrphans().filter(o => {
      return (
        !o.reportsToEmail ||
        o.reportsToEmail.trim() === '' ||
        o.reportsToEmail.toLowerCase() === o.email.toLowerCase() ||
        !userMapByEmail.has(o.reportsToEmail.toLowerCase())
      );
    });
    
    if (orphans.length > 0 && ceo && !ceo.isVirtual) {
      console.warn(`⚠️ Found ${orphans.length} orphaned employees, attaching to CEO`);
      orphans.forEach(orphan => {
        if (!ceo.children.find(c => c._id === orphan._id)) {
          ceo.children.push(orphan);
        }
      });
    }

    // Sort children recursively
    const sortChildren = (node) => {
      if (node.children && node.children.length > 0) {
        node.children.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        node.children.forEach(child => sortChildren(child));
      }
    };

    if (ceo) {
      sortChildren(ceo);
    }

    return ceo;
  };

  const findPathToUser = (node, targetId, pathNodes) => {
    if (!node) return false;
    
    if (String(node._id) === String(targetId) || node.isCurrentUser) {
      pathNodes.add(node._id || node.email);
      return true;
    }

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        if (findPathToUser(child, targetId, pathNodes)) {
          pathNodes.add(node._id || node.email);
          return true;
        }
      }
    }

    return false;
  };

  const calculateLevel = (node, targetId, currentLevel = 0) => {
    if (!node) return -1;
  
    if (String(node._id) === String(targetId) || node.isCurrentUser) {
      return node.isVirtual ? currentLevel : currentLevel;
    }

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const level = calculateLevel(child, targetId, node.isVirtual ? currentLevel : currentLevel + 1);
        if (level !== -1) return level;
      }
    }

    return -1;
  };

  const getEscalationPath = (node, targetId, path = []) => {
    if (!node) return null;
    
    if (String(node._id) === String(targetId) || node.isCurrentUser) {
      return [...path, node].reverse();
    }

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const result = getEscalationPath(child, targetId, [...path, node]);
        if (result) return result;
      }
    }

    return null;
  };

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const getLevelBadgeStyle = (level) => {
    if (!level) return { bg: '#f3f4f6', text: '#6b7280' };
    
    // Leadership levels (1-5)
    if (level <= 5) {
      return { bg: '#fef3c7', text: '#92400e', border: '#fbbf24' };
    }
    // Senior levels (6-10)
    else if (level <= 10) {
      return { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' };
    }
    // Mid levels (11-13)
    else if (level <= 13) {
      return { bg: '#d1fae5', text: '#065f46', border: '#10b981' };
    }
    // Junior levels (14+)
    else {
      return { bg: '#e0e7ff', text: '#3730a3', border: '#6366f1' };
    }
  };

  const renderNode = (node, level = 0) => {
    if (!node) return null;

    const nodeId = node._id || node.email;
    const isExpanded = expandedNodes.has(nodeId);
    const hasChildren = node.children && node.children.length > 0;
    const isCurrentUser = String(node._id) === String(user.id) || node.isCurrentUser;
    const isVirtual = node.isVirtual;
    
    const levelStyle = getLevelBadgeStyle(node.level);
    
    return (
      <div key={nodeId} style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        minHeight: 'fit-content',
      }}>
        {/* Node Card */}
        <div
          style={{
            position: 'relative',
            width: CARD_WIDTH,
            background: isCurrentUser 
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : isVirtual 
              ? '#f3f4f6'
              : 'white',
            border: isCurrentUser 
              ? '3px solid #667eea'
              : '2px solid #e5e7eb',
            borderRadius: 12,
            padding: 16,
            cursor: hasChildren ? 'pointer' : 'default',
            transition: 'all 0.3s ease',
            boxShadow: isCurrentUser 
              ? '0 8px 24px rgba(102, 126, 234, 0.4)'
              : '0 4px 12px rgba(0,0,0,0.1)',
            marginBottom: 0,
          }}
          onClick={() => hasChildren && toggleNode(nodeId)}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = isCurrentUser 
              ? '0 12px 32px rgba(102, 126, 234, 0.5)'
              : '0 8px 20px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = isCurrentUser 
              ? '0 8px 24px rgba(102, 126, 234, 0.4)'
              : '0 4px 12px rgba(0,0,0,0.1)';
          }}
        >
          {/* Level Badge - Top Right Corner */}
          {!isVirtual && node.level && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: isCurrentUser ? 'rgba(255,255,255,0.3)' : levelStyle.bg,
                color: isCurrentUser ? 'white' : levelStyle.text,
                border: isCurrentUser ? '1px solid rgba(255,255,255,0.5)' : `1px solid ${levelStyle.border}`,
                borderRadius: 8,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              <span style={{ fontSize: 9 }}>▲</span>
              <span>L{node.level}</span>
            </div>
          )}

          {/* Avatar and Info */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              {!isVirtual && node.photoUrl ? (
                <img
                  src={node.photoUrl}
                  alt=""
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: isCurrentUser ? '3px solid white' : '2px solid #e5e7eb',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: isCurrentUser 
                      ? 'rgba(255,255,255,0.3)'
                      : isVirtual
                      ? '#d1d5db'
                      : 'linear-gradient(135deg, #667eea, #764ba2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: 20,
                    border: isCurrentUser ? '3px solid white' : 'none',
                  }}
                >
                  {node.name?.charAt(0) || '?'}
                </div>
              )}
              {!isVirtual && (
                <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'white', borderRadius: '50%', padding: 3 }}>
                  <LeaveStatusDot userId={node._id} size={12} />
                </div>
              )}
            </div>

            {/* Name and Details */}
            <div style={{ textAlign: 'center', width: '100%' }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: isCurrentUser ? 'white' : '#111827',
                  marginBottom: 4,
                  wordBreak: 'break-word',
                }}
              >
                {node.name}
                {isCurrentUser && (
                  <div
                    style={{
                      marginTop: 4,
                      padding: '2px 8px',
                      background: 'rgba(255,255,255,0.3)',
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      display: 'inline-block',
                    }}
                  >
                    YOU
                  </div>
                )}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: isCurrentUser ? 'rgba(255,255,255,0.95)' : '#6b7280',
                  marginBottom: 2,
                }}
              >
                {node.designation}
                {node.role && node.role !== 'Employee' && (
                  <span style={{ marginLeft: 4 }}>• {node.role}</span>
                )}
              </div>
              {!isVirtual && (
                <div
                  style={{
                    fontSize: 10,
                    color: isCurrentUser ? 'rgba(255,255,255,0.85)' : '#9ca3af',
                    wordBreak: 'break-all',
                  }}
                >
                  {node.email}
                </div>
              )}
            </div>

            {/* Expand/Collapse Indicator */}
            {hasChildren && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 8,
                  padding: '4px 12px',
                  background: isCurrentUser 
                    ? 'rgba(255,255,255,0.2)'
                    : '#f3f4f6',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  color: isCurrentUser ? 'white' : '#6b7280',
                }}
              >
                <span>{node.children.length} {node.children.length === 1 ? 'report' : 'reports'}</span>
                <span
                  style={{
                    fontSize: 14,
                    transition: 'transform 0.3s ease',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  ▼
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Vertical Connector Line */}
        {hasChildren && isExpanded && (
          <div
            style={{
              width: 2,
              height: 30,
              background: '#d1d5db',
              flexShrink: 0,
            }}
          />
        )}

        {/* Children Container */}
        {hasChildren && isExpanded && (
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}>
            {node.children.length > 1 && (
              <div
                style={{
                  position: 'relative',
                  width: `${(node.children.length - 1) * (CARD_WIDTH + 40)}px`,
                  height: 2,
                  background: '#d1d5db',
                  marginBottom: CHILD_VERTICAL_GAP,
                }}
              />
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                gap: 40,
                flexWrap: 'nowrap',
                width: 'fit-content',
              }}
            >
              {node.children.map((child, index) => (
                <div key={child._id} style={{ 
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}>
                  {node.children.length > 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -CHILD_VERTICAL_GAP,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 2,
                        height: CHILD_VERTICAL_GAP,
                        background: '#d1d5db',
                      }}
                    />
                  )}
                  {renderNode(child, level + 1)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const userLevel = hierarchy ? calculateLevel(hierarchy, user.id) : 0;
  const escalationPath = hierarchy ? getEscalationPath(hierarchy, user.id) : [];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 16,
          maxWidth: 1200,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 32px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            background: 'white',
            zIndex: 10,
          }}
        >
          <div>
            <h2 style={{ margin: 0, marginBottom: 4, fontSize: 24, fontWeight: 700, color: '#111827' }}>
              Organization Hierarchy
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
              View your position in the organizational structure and reporting chain
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              background: 'white',
              cursor: 'pointer',
              fontSize: 20,
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 32 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>Loading organization chart...</div>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ef4444' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{error}</div>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    borderRadius: 12,
                    padding: 20,
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                  }}
                >
                  <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Your Level</div>
                  <div style={{ fontSize: 36, fontWeight: 700 }}>
                    Level {userWithLevel.level || 'N/A'}
                  </div>
                </div>

                <div
                  style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    padding: 20,
                  }}
                >
                  <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                    Your People
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 700, color: '#3b82f6' }}>
                    {(() => {
                      const findUserNode = (node) => {
                        if (!node) return null;
                        if (node._id === user.id || node.isCurrentUser) return node;
                        if (node.children && node.children.length > 0) {
                          for (const child of node.children) {
                            const found = findUserNode(child);
                            if (found) return found;
                          }
                        }
                        return null;
                      };
                      const userNode = hierarchy ? findUserNode(hierarchy) : null;
                      return userNode?.children?.length || 0;
                    })()}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    people reporting to you
                  </div>
                </div>
              </div>

              {/* Escalation Path */}
              {escalationPath && escalationPath.length > 1 && (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '2px solid #fbbf24',
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 24,
                  }}
                >
                  <h4 style={{ margin: 0, marginBottom: 16, color: '#92400e' }}>
                    📊 Your Escalation Path
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {escalationPath.map((person, idx) => (
                      <React.Fragment key={person.email || person._id}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 16px',
                            background: person._id === user.id ? '#fef3c7' : 'white',
                            borderRadius: 8,
                            border: person._id === user.id ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                          }}
                        >
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: person._id === user.id 
                                ? '#f59e0b'
                                : 'linear-gradient(135deg, #667eea, #764ba2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 700,
                              fontSize: 13,
                            }}
                          >
                            {person.name?.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                              {person.name}
                              {person._id === user.id && (
                                <span
                                  style={{
                                    marginLeft: 6,
                                    fontSize: 10,
                                    color: '#92400e',
                                    fontWeight: 700,
                                  }}
                                >
                                  (YOU)
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: '#6b7280' }}>
                              {person.designation}
                              {person.level && (
                                <span style={{ marginLeft: 6, color: '#9ca3af' }}>• L{person.level}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {idx < escalationPath.length - 1 && (
                          <div style={{ fontSize: 20, color: '#d97706' }}>→</div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* Hierarchy Tree */}
              <div
                style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: 24,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h4 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
                    Organization Chart
                  </h4>
                  <button
                    onClick={() => {
                      const pathNodes = new Set();
                      findPathToUser(hierarchy, user.id, pathNodes);
                      setExpandedNodes(pathNodes);
                    }}
                    style={{
                      padding: '8px 16px',
                      background: 'white',
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: '#374151',
                    }}
                  >
                    🔄 Show My Path
                  </button>
                </div>

                {/* ZOOM + SCROLL container */}
                <div
                  style={{
                    width: '100%',
                    overflow: 'auto',
                    border: '1px solid #e5e7eb',
                    padding: 20,
                  }}
                >
                  <div
                    style={{
                      zoom: scale,
                    }}
                  >
                    {hierarchy && renderNode(hierarchy)}
                  </div>
                </div>

                {/* Zoom Controls */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 10,
                    marginTop: 15,
                  }}
                >
                  <button
                    onClick={() => setScale(prev => Math.max(0.5, prev - 0.1))}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid #d1d5db',
                      background: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    ➖ Zoom Out
                  </button>

                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {Math.round(scale * 100)}%
                    </div>

                  <button
                    onClick={() => setScale(prev => Math.min(2, prev + 0.1))}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid #d1d5db',
                      background: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    ➕ Zoom In
                  </button>
                </div>
              </div>

              {/* Level Legend */}
              <div
                style={{
                  marginTop: 20,
                  padding: 16,
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  display: 'flex',
                  gap: 20,
                  flexWrap: 'wrap',
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      borderRadius: 4,
                      border: '2px solid #667eea',
                    }}
                  />
                  <span style={{ color: '#6b7280' }}>Your Position</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      background: '#fef3c7',
                      borderRadius: 4,
                      border: '1px solid #fbbf24',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      color: '#92400e',
                    }}
                  >
                    L1
                  </div>
                  <span style={{ color: '#6b7280' }}>Leadership (L1-5)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      background: '#dbeafe',
                      borderRadius: 4,
                      border: '1px solid #3b82f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      color: '#1e40af',
                    }}
                  >
                    L8
                  </div>
                  <span style={{ color: '#6b7280' }}>Senior (L6-10)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      background: '#d1fae5',
                      borderRadius: 4,
                      border: '1px solid #10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      color: '#065f46',
                    }}
                  >
                    L11
                  </div>
                  <span style={{ color: '#6b7280' }}>Mid (L11-13)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      background: '#e0e7ff',
                      borderRadius: 4,
                      border: '1px solid #6366f1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      color: '#3730a3',
                    }}
                  >
                    L14
                  </div>
                  <span style={{ color: '#6b7280' }}>Junior (L14+)</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizationHierarchy;