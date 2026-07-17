import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from "react";
import PixieMark from "./PixieMark";

type ErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("SavePixie could not render this screen", error, info);
  }

  private reload = () => window.location.reload();

  private returnHome = () => window.location.assign("/");

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <main className="fatal-error-shell">
        <section className="fatal-error-card" role="alert">
          <PixieMark size="medium" mood="curious" />
          <span className="eyebrow">A little pixie tangle</span>
          <h1>This screen didn’t open properly</h1>
          <p>
            Your saved progress is still safe. Try this screen again, or return to the SavePixie
            welcome page.
          </p>
          <div className="button-row">
            <button className="button primary" type="button" onClick={this.reload}>
              Try again
            </button>
            <button className="button secondary" type="button" onClick={this.returnHome}>
              Return home
            </button>
          </div>
          <a href="mailto:support@savepixie.com">Still stuck? Contact support</a>
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;
