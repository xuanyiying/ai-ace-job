import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SuggestionCard from './SuggestionCard';
import { Suggestion, SuggestionStatus, SuggestionType } from '../types';

describe('SuggestionCard', () => {
  const mockSuggestion: Suggestion = {
    id: 'test-1',
    type: SuggestionType.CONTENT,
    section: 'experience',
    itemIndex: 0,
    original: 'Worked on project',
    optimized:
      'Led and managed project implementation resulting in 30% efficiency improvement',
    reason: 'Rewritten using STAR method to better demonstrate impact',
    status: SuggestionStatus.PENDING,
  };

  it('should render suggestion card with type and status tags', () => {
    const mockOnAccept = vi.fn();
    const mockOnReject = vi.fn();

    render(
      <SuggestionCard
        suggestion={mockSuggestion}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
        index={0}
      />
    );

    expect(screen.getByText('内容优化')).toBeInTheDocument();
    expect(screen.getByText('待处理')).toBeInTheDocument();
  });

  it('should render original and optimized text', () => {
    const mockOnAccept = vi.fn();
    const mockOnReject = vi.fn();

    render(
      <SuggestionCard
        suggestion={mockSuggestion}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
        index={0}
      />
    );

    expect(screen.getByText(mockSuggestion.original)).toBeInTheDocument();
    expect(screen.getByText(mockSuggestion.optimized)).toBeInTheDocument();
  });

  it('should display accept and reject buttons for pending suggestions', () => {
    const mockOnAccept = vi.fn();
    const mockOnReject = vi.fn();

    render(
      <SuggestionCard
        suggestion={mockSuggestion}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
        index={0}
      />
    );

    expect(screen.getByText('接受')).toBeInTheDocument();
    expect(screen.getByText('拒绝')).toBeInTheDocument();
  });

  it('should call onAccept when accept button is clicked', async () => {
    const mockOnAccept = vi.fn().mockResolvedValue(undefined);
    const mockOnReject = vi.fn();

    render(
      <SuggestionCard
        suggestion={mockSuggestion}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
        index={0}
      />
    );

    const acceptButton = screen.getByText('接受');
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(mockOnAccept).toHaveBeenCalledWith(mockSuggestion.id);
    });
  });

  it('should call onReject when reject button is clicked', async () => {
    const mockOnAccept = vi.fn();
    const mockOnReject = vi.fn().mockResolvedValue(undefined);

    render(
      <SuggestionCard
        suggestion={mockSuggestion}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
        index={0}
      />
    );

    const rejectButton = screen.getByText('拒绝');
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(mockOnReject).toHaveBeenCalledWith(mockSuggestion.id);
    });
  });

  it('should disable buttons for accepted suggestions', () => {
    const acceptedSuggestion: Suggestion = {
      ...mockSuggestion,
      status: SuggestionStatus.ACCEPTED,
    };

    const mockOnAccept = vi.fn();
    const mockOnReject = vi.fn();

    render(
      <SuggestionCard
        suggestion={acceptedSuggestion}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
        index={0}
      />
    );

    expect(screen.getByText('✓ 已接受此建议')).toBeInTheDocument();
    expect(screen.queryByText('接受')).not.toBeInTheDocument();
    expect(screen.queryByText('拒绝')).not.toBeInTheDocument();
  });

  it('should disable buttons for rejected suggestions', () => {
    const rejectedSuggestion: Suggestion = {
      ...mockSuggestion,
      status: SuggestionStatus.REJECTED,
    };

    const mockOnAccept = vi.fn();
    const mockOnReject = vi.fn();

    render(
      <SuggestionCard
        suggestion={rejectedSuggestion}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
        index={0}
      />
    );

    expect(screen.getByText('✗ 已拒绝此建议')).toBeInTheDocument();
    expect(screen.queryByText('接受')).not.toBeInTheDocument();
    expect(screen.queryByText('拒绝')).not.toBeInTheDocument();
  });

  it('should display correct type tag for different suggestion types', () => {
    const keywordSuggestion: Suggestion = {
      ...mockSuggestion,
      type: SuggestionType.KEYWORD,
    };

    const mockOnAccept = vi.fn();
    const mockOnReject = vi.fn();

    render(
      <SuggestionCard
        suggestion={keywordSuggestion}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
        index={0}
      />
    );

    expect(screen.getByText('关键词')).toBeInTheDocument();
  });

  it('should display section information', () => {
    const mockOnAccept = vi.fn();
    const mockOnReject = vi.fn();

    render(
      <SuggestionCard
        suggestion={mockSuggestion}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
        index={0}
      />
    );

    expect(screen.getByText('experience')).toBeInTheDocument();
  });
});
