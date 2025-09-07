import React from 'react';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';
import { 
  LayoutDashboard, 
  Target, 
  Globe, 
  Settings, 
  Key,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const SidebarContainer = styled.aside`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: ${props => props.isOpen ? '280px' : '0'};
  background: ${props => props.theme.colors.surface};
  border-right: 1px solid ${props => props.theme.colors.border};
  transition: width 0.3s ease;
  overflow: hidden;
  z-index: 1000;

  @media (max-width: 768px) {
    width: ${props => props.isOpen ? '100%' : '0'};
    background: ${props => props.theme.colors.background};
  }
`;

const SidebarContent = styled.div`
  padding: 1.5rem 0;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const Logo = styled.div`
  padding: 0 1.5rem 2rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  margin-bottom: 2rem;
`;

const LogoText = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.theme.colors.primary};
  margin: 0;
`;

const LogoSubtext = styled.p`
  font-size: 0.75rem;
  color: ${props => props.theme.colors.textMuted};
  margin: 0.25rem 0 0;
`;

const Nav = styled.nav`
  flex: 1;
  padding: 0 1rem;
`;

const NavList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const NavItem = styled.li`
  margin-bottom: 0.5rem;
`;

const NavLinkStyled = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  color: ${props => props.theme.colors.textSecondary};
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
    color: ${props => props.theme.colors.text};
  }

  &.active {
    background: ${props => props.theme.colors.primary}20;
    color: ${props => props.theme.colors.primary};
    
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 20px;
      background: ${props => props.theme.colors.primary};
      border-radius: 0 2px 2px 0;
    }
  }

  svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
`;

const UserSection = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid ${props => props.theme.colors.border};
  margin-top: auto;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const UserAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => props.theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
`;

const UserDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const UserName = styled.div`
  font-weight: 600;
  font-size: 0.875rem;
  color: ${props => props.theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UserTier = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.colors.textMuted};
  text-transform: capitalize;
`;

const ToggleButton = styled.button`
  position: absolute;
  top: 1rem;
  right: -12px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 1001;

  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
  }

  svg {
    width: 14px;
    height: 14px;
    color: ${props => props.theme.colors.textSecondary};
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const MobileOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: ${props => props.isOpen ? 'block' : 'none'};

  @media (min-width: 769px) {
    display: none;
  }
`;

const Sidebar = ({ isOpen, onToggle, currentPath }) => {
  const { user } = useAuth();

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/campaigns', icon: Target, label: 'Campaigns' },
    { path: '/wordpress', icon: Globe, label: 'WordPress Sites' },
    { path: '/license', icon: Key, label: 'License' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const getUserInitials = () => {
    if (!user) return 'U';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 'U';
  };

  return (
    <>
      <MobileOverlay isOpen={isOpen} onClick={onToggle} />
      <SidebarContainer isOpen={isOpen}>
        <ToggleButton onClick={onToggle}>
          {isOpen ? <ChevronLeft /> : <ChevronRight />}
        </ToggleButton>
        
        <SidebarContent>
          <Logo>
            <LogoText>Fiddy</LogoText>
            <LogoSubtext>AutoPublisher</LogoSubtext>
          </Logo>

          <Nav>
            <NavList>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavItem key={item.path}>
                    <NavLinkStyled to={item.path}>
                      <Icon />
                      <span>{item.label}</span>
                    </NavLinkStyled>
                  </NavItem>
                );
              })}
            </NavList>
          </Nav>

          {user && (
            <UserSection>
              <UserInfo>
                <UserAvatar>
                  {getUserInitials()}
                </UserAvatar>
                <UserDetails>
                  <UserName>
                    {user.firstName} {user.lastName}
                  </UserName>
                  <UserTier>
                    {user.subscriptionTier} Plan
                  </UserTier>
                </UserDetails>
              </UserInfo>
            </UserSection>
          )}
        </SidebarContent>
      </SidebarContainer>
    </>
  );
};

export default Sidebar;

