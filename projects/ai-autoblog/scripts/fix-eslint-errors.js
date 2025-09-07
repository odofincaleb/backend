#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing ESLint errors...');

// Fix Header.js
const headerPath = path.join(__dirname, '..', 'frontend', 'src', 'components', 'Layout', 'Header.js');
let headerContent = fs.readFileSync(headerPath, 'utf8');
headerContent = headerContent.replace('import { Menu, Bell, LogOut, Moon, Sun } from \'lucide-react\';', 'import { Menu, Bell, LogOut, Moon, Sun } from \'lucide-react\';');
fs.writeFileSync(headerPath, headerContent);

// Fix Sidebar.js
const sidebarPath = path.join(__dirname, '..', 'frontend', 'src', 'components', 'Layout', 'Sidebar.js');
let sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
sidebarContent = sidebarContent.replace(/import { [^}]*Menu[^}]* } from 'lucide-react';/, 'import { LayoutDashboard, Target, Globe, Settings, Key } from \'lucide-react\';');
sidebarContent = sidebarContent.replace(/import { [^}]*X[^}]* } from 'lucide-react';/, '');
fs.writeFileSync(sidebarPath, sidebarContent);

// Fix Login.js
const loginPath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'Auth', 'Login.js');
let loginContent = fs.readFileSync(loginPath, 'utf8');
loginContent = loginContent.replace(/import { [^}]*toast[^}]* } from 'react-hot-toast';/, 'import toast from \'react-hot-toast\';');
fs.writeFileSync(loginPath, loginContent);

// Fix Register.js
const registerPath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'Auth', 'Register.js');
let registerContent = fs.readFileSync(registerPath, 'utf8');
registerContent = registerContent.replace(/import { [^}]*toast[^}]* } from 'react-hot-toast';/, 'import toast from \'react-hot-toast\';');
registerContent = registerContent.replace(/href="#"/g, 'href="/forgot-password"');
fs.writeFileSync(registerPath, registerContent);

// Fix CreateCampaign.js
const createCampaignPath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'Campaigns', 'CreateCampaign.js');
let createCampaignContent = fs.readFileSync(createCampaignPath, 'utf8');
createCampaignContent = createCampaignContent.replace(/import { [^}]*Save[^}]* } from 'lucide-react';/, 'import { ArrowLeft } from \'lucide-react\';');
createCampaignContent = createCampaignContent.replace(/import { [^}]*Play[^}]* } from 'lucide-react';/, '');
fs.writeFileSync(createCampaignPath, createCampaignContent);

// Fix Dashboard.js
const dashboardPath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'Dashboard', 'Dashboard.js');
let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
dashboardContent = dashboardContent.replace(/import { [^}]*CheckCircle[^}]* } from 'lucide-react';/, 'import { TrendingUp, FileText, Plus, Globe } from \'lucide-react\';');
dashboardContent = dashboardContent.replace(/import { [^}]*AlertCircle[^}]* } from 'lucide-react';/, '');
dashboardContent = dashboardContent.replace(/import { [^}]*Badge[^}]* } from '..\/..\/styles\/GlobalStyles';/, '');
dashboardContent = dashboardContent.replace(/const getSubscriptionColor = [^;]+;/g, '');
dashboardContent = dashboardContent.replace(/const getSubscriptionLabel = [^;]+;/g, '');
fs.writeFileSync(dashboardPath, dashboardContent);

// Fix License.js
const licensePath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'License', 'License.js');
let licenseContent = fs.readFileSync(licensePath, 'utf8');
licenseContent = licenseContent.replace(/import { [^}]*X[^}]* } from 'lucide-react';/, 'import { Key, CheckCircle, AlertCircle } from \'lucide-react\';');
fs.writeFileSync(licensePath, licenseContent);

// Fix WordPressSites.js
const wordpressPath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'WordPress', 'WordPressSites.js');
let wordpressContent = fs.readFileSync(wordpressPath, 'utf8');
wordpressContent = wordpressContent.replace(/import { [^}]*Link[^}]* } from 'react-router-dom';/, 'import { useNavigate } from \'react-router-dom\';');
fs.writeFileSync(wordpressPath, wordpressContent);

console.log('✅ ESLint errors fixed!');

