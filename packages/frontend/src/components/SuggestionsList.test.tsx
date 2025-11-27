import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SuggestionsList from './SuggestionsList';
import type { Suggestion } from './SuggestionCard';

describe('SuggestionsList', () => {
  const mockSuggestions: Suggestion[] = [
    {
      id: 'test-1',
      type: 'content',
      section: 'experience',
      itemIndex: 0,
      original: 'Worked on project',
      optimized: 'Led and managed project implementation',
      reason: 'Rewritten using STAR method',
      status: 'pending',
    },
    {
      id: 'test-2',
      type: 'keyword',
      section: 'skills',
      original: 'Current skills',
      optimized: 'Add React to skills',
      reason: 'React is required for this role',
      status: 'pending',
    },
    {
      id: 'test-3',
      type: 'quantification',
      section: 'experience',
      itemIndex: 1,
      original: 'Improved performance',
      optimized: 'Improved performance by 40%',
      reason: 'Add quantifiable metrics',
      status: 'accepted',
    },
  ];

  it('should render suggestions list with statistics', () => {
    const mockOnAccept = vi.fn();
    const mockOnReject = vi.fn();

    render(
      <SuggestionsList
        suggestions={mockSuggestions}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText('总建议数')).toBeInTheDocument();
    const acceptedElements = screen.getAllByText('已接受');
    expect(acceptedElements.length).toBeGreaterThan(0);
  });

  it('should render all suggestions', () => {
    const mockOnAccept = vi.fn();
    const mockOnReject = vi.fn();

    render(
      <SuggestionsList
        suggestions={mockSuggestions}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText('建议 1')).toBeInTheDocument();
    expect(screen.getByText('建议 2')).toBeInTheDocument();
    expect(screen.getByText('建议 3')).toBeInTheDocument();
  });

  it('should display accept all button when there are pending suggestions', () => {
    const mockOnAccept = vi.fn();
    const mockOnReject = vi.fn();

    render(
      <SuggestionsList
        suggestions={mockSuggestions}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText(/接受全部/)).toBeInTheDocument();
  });

  it('should call onAcceptAll when accept all button is clicked', async () => {
    const mockOnAccept = vi.fn();
    const mockOnReject = vi.fn();
    const mockOnAcceptAll = vi.fn().mockResolvedValue(undefined);

    render(
      <SuggestionsList
        suggestions={mockSuggestions}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
        onAcceptAll={mockOnAcceptAll}
      />
    );

    const acceptAllButton = screen.getByText(/接受全部/);
    fireEvent.click(acceptAllButton);

    await waitFor(() => {
      expect(mockOnAcceptAll).toHaveBeenCalled();
    });
  });

  it('should show empty state when no suggestions', () => {
    const mockOnAccept = vi.fn();
    const mockOnReject = vi.fn();

    render(
      <SuggestionsList
        suggestions={[]}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText('暂无优化建议')).toBeInTheDocument();
  });

  it('should display loading state', () => {
    const mockOnAccept = vi.fn();
    const mockOnReject = vi.fn();

    const { container } = render(
      <SuggestionsList
        suggestions={mockSuggestions}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
        loading={true}
      />
    );

    // Check if Spin component is present (loading indicator)
    expect(container.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('should pass correct props to SuggestionCard components', () => {
    const mockOnAccept = vi.fn();
    const mockOnReject = vi.fn();

    render(
      <SuggestionsList
        suggestions={mockSuggestions}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    // Verify that suggestion cards are rendered
    expect(screen.getByText('建议 1')).toBeInTheDocument();
    expect(screen.getByText('建议 2')).toBeInTheDocument();
    expect(screen.getByText('建议 3')).toBeInTheDocument();
  });
});
