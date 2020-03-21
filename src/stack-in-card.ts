import { CARD_VERSION } from './version-const';
import { LitElement, customElement, property, TemplateResult, html } from 'lit-element';
import { ifDefined } from 'lit-html/directives/if-defined';
import { HomeAssistant, LovelaceCardConfig, createThing, LovelaceCard } from 'custom-card-helpers';
import { StackInCardConfig } from './types';

console.info(
  `%c STACK-IN-CARD \n%c   Version ${CARD_VERSION}   `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HELPERS = (window as any).loadCardHelpers ? (window as any).loadCardHelpers() : undefined;

@customElement('stack-in-card')
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class StackInCard extends LitElement {
  @property() protected _card?: LovelaceCard;

  @property() private _config?: StackInCardConfig;

  @property() private _hass?: HomeAssistant;

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (this._card) {
      this._card.hass = hass;
    }
  }

  public setConfig(config: StackInCardConfig): void {
    if (!config.cards) {
      throw new Error(`There is no card parameter defined`);
    }
    this._config = {
      mode: 'vertical',
      ...config,
    };
    this._createCard({
      type: `${this._config.mode}-stack`,
      cards: this._config.cards,
    }).then(card => {
      this._card = card;
      this._waitForChildren(this._card);
    });
  }

  protected render(): TemplateResult {
    if (!this._hass || !this._card || !this._config) {
      return html``;
    }

    return html`
      <ha-card header=${ifDefined(this._config.title)}>
        <div>${this._card}</div>
      </ha-card>
    `;
  }

  private _updateStyle(e: LovelaceCard | null): void {
    if (!e) return;
    e.style.boxShadow = 'none';
    if (getComputedStyle(e).getPropertyValue('--keep-background') !== 'true') {
      e.style.background = 'transparent';
    }
    e.style.borderRadius = '0';
  }

  private _loopChildren(e: LovelaceCard): void {
    const searchElements = e.childNodes;
    searchElements.forEach(childE => {
      if ((childE as LovelaceCard).style) {
        (childE as LovelaceCard).style.margin = '0px';
      }
      this._waitForChildren(childE as LovelaceCard);
    });
  }

  private _updateChildren(element: LovelaceCard | undefined): void {
    if (!element) return;
    if (element.shadowRoot) {
      const card = element.shadowRoot.querySelector('ha-card') as LovelaceCard;
      if (!card) {
        const searchEles = element.shadowRoot.getElementById('root') || element.shadowRoot.getElementById('card');
        if (!searchEles) return;
        this._loopChildren(searchEles as LovelaceCard);
      } else {
        this._updateStyle(card);
      }
    } else {
      if (typeof element.querySelector === 'function' && element.querySelector('ha-card')) {
        this._updateStyle(element.querySelector('ha-card'));
      }
      this._loopChildren(element as LovelaceCard);
    }
  }

  private _waitForChildren(element: LovelaceCard | undefined): void {
    if (((element as unknown) as LitElement).updateComplete) {
      ((element as unknown) as LitElement).updateComplete.then(() => {
        this._updateChildren(element);
      });
    } else {
      this._updateChildren(element);
    }
  }

  private async _createCard(config: LovelaceCardConfig): Promise<LovelaceCard> {
    let element: LovelaceCard;
    if (HELPERS) {
      element = (await HELPERS).createCardElement(config);
    } else {
      element = createThing(config);
    }
    if (this._hass) {
      element.hass = this._hass;
    }
    element.addEventListener(
      'll-rebuild',
      ev => {
        ev.stopPropagation();
        this._rebuildCard(element, config);
      },
      { once: true },
    );
    return element;
  }

  private async _rebuildCard(element: LovelaceCard, config: LovelaceCardConfig): Promise<LovelaceCard> {
    const newCard = await this._createCard(config);
    element.replaceWith(newCard);
    return newCard;
  }

  public getCardSize(): number {
    return this._card && typeof this._card.getCardSize === 'function' ? this._card.getCardSize() : 1;
  }
}