import { Component, type ReactNode } from 'react';

export class DatePickerBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  override state: { error: string | null } = { error: null };
  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : 'خطای انتخابگر تاریخ' };
  }
  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="auth-error" role="alert">
        <p>انتخابگر تاریخ باز نشد. بقیهٔ فرم در دسترس است.</p>
        <details>
          <summary>جزئیات خطا</summary>
          <code dir="ltr">{this.state.error}</code>
        </details>
        <button type="button" onClick={() => this.setState({ error: null })}>
          تلاش دوباره
        </button>
      </div>
    );
  }
}
