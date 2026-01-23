import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('should render without label', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('should render with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('should display error message', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('should display hint when no error', () => {
    render(<Input hint="Optional field" />);
    expect(screen.getByText('Optional field')).toBeInTheDocument();
  });

  it('should not display hint when there is an error', () => {
    render(<Input error="Error" hint="This hint should not show" />);
    expect(screen.queryByText('This hint should not show')).not.toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('should handle value changes', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(handleChange).toHaveBeenCalled();
  });

  it('should apply error styling', () => {
    render(<Input error="Error" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-red-300');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('should render left icon', () => {
    const leftIcon = <span data-testid="left-icon">🔍</span>;
    render(<Input leftIcon={leftIcon} />);
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
  });

  it('should render right icon', () => {
    const rightIcon = <span data-testid="right-icon">✓</span>;
    render(<Input rightIcon={rightIcon} />);
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('should forward ref', () => {
    const ref = { current: null };
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('should auto-generate id and link label to input', () => {
    render(<Input label="User Name" />);
    const input = screen.getByRole('textbox');
    const label = screen.getByText('User Name');
    // Check that the input has an id and the label is properly linked
    expect(input).toHaveAttribute('id');
    expect(label).toHaveAttribute('for', input.getAttribute('id'));
  });

  it('should use provided id over auto-generated', () => {
    render(<Input label="User Name" id="custom-id" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('id', 'custom-id');
  });
});
