/*
 * -- copyright
 * OpenProject is an open source project management software.
 * Copyright (C) the OpenProject GmbH
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License version 3.
 *
 * OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
 * Copyright (C) 2006-2013 Jean-Philippe Lang
 * Copyright (C) 2010-2013 the ChiliProject Team
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * See COPYRIGHT and LICENSE files for more details.
 * ++
 */

import { Controller } from '@hotwired/stimulus';

export default class PatternInputController extends Controller {
  static targets = [
    'tokenTemplate',
    'content',
    'formInput',
    'suggestions',
  ];

  declare readonly tokenTemplateTarget:HTMLTemplateElement;
  declare readonly contentTarget:HTMLElement;
  declare readonly formInputTarget:HTMLInputElement;
  declare readonly suggestionsTarget:HTMLElement;

  static values = {
    patternInitial: String,
    suggestionsInitial: Object,
  };

  declare patternInitialValue:string;
  declare suggestionsInitialValue:Record<string, Record<string, string>>;

  currentRange:Range|undefined = undefined;

  connect() {
    this.contentTarget.innerHTML = this.toHtml(this.patternInitialValue) || ' ';
  }

  // Input field events
  input_keydown(event:KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
    }

    if (event.key === 'ArrowDown') {
      const firstSuggestion = this.suggestionsTarget.querySelector('[role="menuitem"]') as HTMLElement;
      firstSuggestion?.focus();
      event.preventDefault();
    }

    // close the suggestions
    if (event.key === 'Escape' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      this.clearSuggestionsFilter();
      this.hide(this.suggestionsTarget);
    }

    // update cursor
    this.setRange();
  }

  input_change() {
    // clean up empty tags from the input
    this.contentTarget.querySelectorAll('span').forEach((element) => element.textContent?.trim() === '' && element.remove());
    this.contentTarget.querySelectorAll('br').forEach((element) => element.remove());

    // show suggestions for the current word
    const word = this.currentWord();
    if (word && word.length > 0) {
      this.filterSuggestions(word);
      this.show(this.suggestionsTarget);
    } else {
      this.clearSuggestionsFilter();
      this.hide(this.suggestionsTarget);
    }

    this.tagInvalidTokens();

    // update cursor
    this.setRange();
  }

  input_mouseup() {
    this.setRange();
  }

  input_focus() {
    this.setRange();
  }

  input_blur() {
    this.updateFormInputValue();
  }

  // Autocomplete events
  suggestions_select(event:PointerEvent) {
    const target = event.currentTarget as HTMLElement;

    if (target) {
      this.insertToken(this.createToken(target.dataset.prop!));
      this.clearSuggestionsFilter();
    }
  }

  // internal methods
  private updateFormInputValue():void {
    this.formInputTarget.value = this.toBlueprint();
  }

  /**
    * Sets an internal representation of the cursor position by persisting the current `Range`
    */
  private setRange():void {
    const selection = document.getSelection();
    if (selection?.rangeCount) {
      const range = selection.getRangeAt(0);
      if (range.startContainer.parentNode === this.contentTarget) {
        this.currentRange = range;
      }
    }
  }

  private insertToken(tokenElement:HTMLElement) {
    if (this.currentRange) {
      const targetNode = this.currentRange.startContainer;
      const targetOffset = this.currentRange.startOffset;

      if (!targetNode.textContent) { return; }

      let pos = targetOffset - 1;
      while (pos > -1 && !this.isWhitespace(targetNode.textContent.charAt(pos))) { pos-=1; }

      const wordRange = document.createRange();
      wordRange.setStart(targetNode, pos + 1);
      wordRange.setEnd(targetNode, targetOffset);

      wordRange.deleteContents();
      wordRange.insertNode(tokenElement);

      const postRange = document.createRange();
      postRange.setStartAfter(tokenElement);

      const selection = document.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(postRange);

      this.updateFormInputValue();
      this.setRange();

      // clear suggestions
      this.clearSuggestionsFilter();
      this.hide(this.suggestionsTarget);
    } else {
      this.contentTarget.appendChild(tokenElement);
    }
  }

  private currentWord():string|null {
    const selection = document.getSelection();
    if (selection) {
      return (selection.anchorNode?.textContent?.slice(0, selection.anchorOffset)
        .split(' ')
        .pop() as string)
        .toLowerCase();
    }

    return null;
  }

  private clearSuggestionsFilter():void {
    const suggestionElements = this.suggestionsTarget.children;
      for (let i = 0; i < suggestionElements.length; i+=1) {
        this.show(suggestionElements[i] as HTMLElement);
      }
  }

  private filterSuggestions(word:string):void {
    const suggestionElements = this.suggestionsTarget.children;
    for (let i = 0; i < suggestionElements.length; i+=1) {
      const suggestionElement = suggestionElements[i] as HTMLElement;
      if (!suggestionElement.dataset.prop) { continue; }

      if (suggestionElement.textContent?.trim().toLowerCase().includes(word) || suggestionElement.dataset.prop.includes(word)) {
        this.show(suggestionElement);
      } else {
        this.hide(suggestionElement);
      }
    }

    // show autocomplete
    this.show(this.suggestionsTarget);
  }

  private tagInvalidTokens():void {
    this.contentTarget.querySelectorAll('[data-role="token"]').forEach((element) => {
      const token = element.textContent?.trim();

      let exists = false;
      Object.keys(this.suggestionsInitialValue).forEach((key) => {
        const group = this.suggestionsInitialValue[key];
        Object.keys(group).forEach((prop) => {
          if (prop === token) { exists = true; }
        });
      });

      if (exists) {
        element.classList.remove('Label--danger');
      } else {
        element.classList.add('Label--danger');
      }
    });
  }

  private hide(el:HTMLElement):void {
    el.setAttribute('hidden', 'hidden');
  }

  private show(el:HTMLElement):void {
    el.removeAttribute('hidden');
  }

  private createToken(value:string):HTMLElement {
    const templateTarget = this.tokenTemplateTarget.content?.cloneNode(true) as HTMLElement;
    const contentElement = templateTarget.firstElementChild as HTMLElement;
    contentElement.innerText = value;
    return contentElement;
  }

  private toHtml(blueprint:string):string {
    return blueprint.replace(/{{([0-9A-Za-z_]+)}}/g, (_, token:string) => this.createToken(token).outerHTML);
  }

  private toBlueprint():string {
    let result = '';
    this.contentTarget.childNodes.forEach((node:Element) => {
      if (node.nodeType === Node.TEXT_NODE) {
        // Plain text node
        result += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).dataset.role === 'token') {
        // Token element
        result += `{{${node.textContent?.trim()}}}`;
      }
    });
    return result.trim();
  }

  private isWhitespace(value:string):boolean {
    return /\s/.test(value);
  }
}
