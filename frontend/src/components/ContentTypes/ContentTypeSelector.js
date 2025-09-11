import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Check, Info, Settings, AlertCircle } from 'lucide-react';
import { Card } from '../../styles/GlobalStyles';

const ContentTypeSelectorContainer = styled.div`
  margin: 2rem 0;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin: 0;
`;

const SectionDescription = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  margin: 0 0 1.5rem 0;
  line-height: 1.5;
`;

const ContentTypesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const ContentTypeCard = styled(Card)`
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid ${props => props.selected ? props.theme.colors.primary : props.theme.colors.border};
  background: ${props => props.selected ? `${props.theme.colors.primary}10` : props.theme.colors.surface};

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    transform: translateY(-1px);
  }
`;

const ContentTypeHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
`;

const ContentTypeCheckbox = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid ${props => props.selected ? props.theme.colors.primary : props.theme.colors.border};
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.selected ? props.theme.colors.primary : 'transparent'};
  color: white;
  font-size: 12px;
  flex-shrink: 0;
`;

const ContentTypeName = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin: 0;
`;

const ContentTypeDescription = styled.p`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.textSecondary};
  margin: 0;
  line-height: 1.5;
`;

const SelectionInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: ${props => props.theme.colors.surfaceHover};
  border-radius: 8px;
  margin-bottom: 1.5rem;
`;

const InfoText = styled.p`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.textSecondary};
  margin: 0;
`;

const VariablesSection = styled.div`
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid ${props => props.theme.colors.border};
`;

const VariablesHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const VariablesTitle = styled.h4`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin: 0;
`;

const VariablesDescription = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  margin: 0 0 1.5rem 0;
  line-height: 1.5;
`;

const VariablesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
`;

const VariableInput = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const VariableLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${props => props.theme.colors.text};
`;

const VariableInputField = styled.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  font-size: 0.875rem;
  background: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text};
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }

  &::placeholder {
    color: ${props => props.theme.colors.textSecondary};
  }
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: ${props => props.theme.colors.errorLight};
  border: 1px solid ${props => props.theme.colors.error};
  border-radius: 8px;
  margin-bottom: 1.5rem;
  color: ${props => props.theme.colors.error};
  font-size: 0.875rem;
`;

const LoadingMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.875rem;
`;

const ContentTypeSelector = ({ 
  selectedTypes = [], 
  onTypesChange,
  variables = {}, 
  onVariablesChange,
  availableTypes = {} 
}) => {
  const [localSelectedTypes, setLocalSelectedTypes] = useState(selectedTypes);
  const [localVariables, setLocalVariables] = useState(variables);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLocalSelectedTypes(selectedTypes);
  }, [selectedTypes]);

  useEffect(() => {
    setLocalVariables(variables);
  }, [variables]);

  useEffect(() => {
    // Check if availableTypes is empty or undefined
    if (!availableTypes || Object.keys(availableTypes).length === 0) {
      setError('Failed to load content types. Please try refreshing the page.');
    } else {
      setError(null);
    }
  }, [availableTypes]);

  const handleTypeToggle = (typeKey) => {
    let newSelectedTypes;
    
    if (localSelectedTypes.includes(typeKey)) {
      // Remove type
      newSelectedTypes = localSelectedTypes.filter(type => type !== typeKey);
    } else {
      // Add type (max 5)
      if (localSelectedTypes.length >= 5) {
        return; // Don't add if already at max
      }
      newSelectedTypes = [...localSelectedTypes, typeKey];
    }
    
    setLocalSelectedTypes(newSelectedTypes);
    onTypesChange(newSelectedTypes);
  };

  const handleVariableChange = (key, value) => {
    const newVariables = { ...localVariables, [key]: value };
    setLocalVariables(newVariables);
    onVariablesChange(newVariables);
  };

  const getSelectedTypesInfo = () => {
    if (localSelectedTypes.length === 0) {
      return 'No content types selected. All 15 types will be used.';
    }
    return `${localSelectedTypes.length} type${localSelectedTypes.length === 1 ? '' : 's'} selected`;
  };

  const getUniqueVariables = () => {
    // Get all variables from selected types
    const allVariables = localSelectedTypes.reduce((acc, typeKey) => {
      const type = availableTypes[typeKey];
      if (type && type.variables) {
        acc.push(...type.variables);
      }
      return acc;
    }, []);

    // Remove duplicates and sort
    const uniqueVariables = [...new Set(allVariables)].sort();

    // Filter out variables that are already set in campaign settings
    const filteredVariables = uniqueVariables.filter(variable => 
      !['TOPIC', 'TONE', 'AUDIENCE'].includes(variable)
    );
    
    return filteredVariables;
  };

  if (error) {
    return (
      <ContentTypeSelectorContainer>
        <ErrorMessage>
          <AlertCircle size={16} />
          {error}
        </ErrorMessage>
      </ContentTypeSelectorContainer>
    );
  }

  if (!availableTypes || Object.keys(availableTypes).length === 0) {
    return (
      <ContentTypeSelectorContainer>
        <LoadingMessage>Loading content types...</LoadingMessage>
      </ContentTypeSelectorContainer>
    );
  }

  return (
    <ContentTypeSelectorContainer>
      <SectionHeader>
        <Settings size={20} />
        <SectionTitle>Content Types</SectionTitle>
      </SectionHeader>
      
      <SectionDescription>
        Choose up to 5 content types for your campaign. The system will randomly select from these types when generating content. If none are selected, all 15 types will be used.
      </SectionDescription>

      <SelectionInfo>
        <Info size={16} />
        <InfoText>{getSelectedTypesInfo()}</InfoText>
      </SelectionInfo>

      <ContentTypesGrid>
        {Object.entries(availableTypes).map(([key, type]) => (
          <ContentTypeCard
            key={key}
            selected={localSelectedTypes.includes(key)}
            onClick={() => handleTypeToggle(key)}
          >
            <ContentTypeHeader>
              <ContentTypeCheckbox selected={localSelectedTypes.includes(key)}>
                {localSelectedTypes.includes(key) && <Check size={12} />}
              </ContentTypeCheckbox>
              <ContentTypeName>{type.name}</ContentTypeName>
            </ContentTypeHeader>
            <ContentTypeDescription>{type.description}</ContentTypeDescription>
          </ContentTypeCard>
        ))}
      </ContentTypesGrid>

      {localSelectedTypes.length > 0 && (
        <VariablesSection>
          <VariablesHeader>
            <Settings size={18} />
            <VariablesTitle>Content Variables</VariablesTitle>
          </VariablesHeader>
          
          <VariablesDescription>
            Customize additional variables for content generation. Variables like TOPIC, TONE, and AUDIENCE are automatically taken from your campaign settings above.
          </VariablesDescription>

          <VariablesGrid>
            {getUniqueVariables().map(variable => (
              <VariableInput key={variable}>
                <VariableLabel>{variable}</VariableLabel>
                <VariableInputField
                  type="text"
                  placeholder={`Enter ${variable.toLowerCase()}`}
                  value={localVariables[variable] || ''}
                  onChange={(e) => handleVariableChange(variable, e.target.value)}
                />
              </VariableInput>
            ))}
          </VariablesGrid>
        </VariablesSection>
      )}
    </ContentTypeSelectorContainer>
  );
};

export default ContentTypeSelector;