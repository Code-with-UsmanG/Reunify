
import { Component, ChangeDetectionStrategy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from './services/gemini.service';

type StyleOption = {
  id: string;
  name: string;
  gradient: string;
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class AppComponent {
  private geminiService = inject(GeminiService);

  childhoodPhoto = signal<string | null>(null);
  currentPhoto = signal<string | null>(null);
  generatedPhoto = signal<string | null>(null);
  
  styleOptions = signal<StyleOption[]>([
    { id: 'friendly', name: 'Friendly', gradient: 'from-yellow-400 to-orange-500' },
    { id: 'cool', name: 'Cool', gradient: 'from-blue-400 to-indigo-500' },
    { id: 'action', name: 'Action', gradient: 'from-red-500 to-pink-500' },
    { id: 'adventure', name: 'Adventure', gradient: 'from-green-400 to-teal-500' },
    { id: 'dreamy', name: 'Dreamy', gradient: 'from-purple-400 to-pink-500' },
  ]);
  selectedStyle = signal<string>('friendly');
  
  isLoading = signal(false);
  statusMessage = signal('');
  errorMessage = signal<string | null>(null);
  editPrompt = signal('');

  canReunify = computed(() => this.childhoodPhoto() && this.currentPhoto() && !this.isLoading());
  canEdit = computed(() => this.generatedPhoto() && this.editPrompt().trim().length > 0 && !this.isLoading());

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  async onPhotoSelected(event: Event, type: 'childhood' | 'current'): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (!file.type.startsWith('image/')) {
        this.errorMessage.set('Please upload a valid image file.');
        return;
      }
      this.errorMessage.set(null);
      const base64 = await this.fileToBase64(file);
      if (type === 'childhood') {
        this.childhoodPhoto.set(base64);
      } else {
        this.currentPhoto.set(base64);
      }
    }
  }

  selectStyle(styleId: string): void {
    this.selectedStyle.set(styleId);
  }

  async reunifyPhotos(): Promise<void> {
    if (!this.canReunify()) return;

    const childPhoto = this.childhoodPhoto();
    const adultPhoto = this.currentPhoto();
    const style = this.selectedStyle();

    if (!childPhoto || !adultPhoto) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.generatedPhoto.set(null);

    try {
      this.statusMessage.set('Step 1/2: Analyzing your photos and chosen style...');
      const descriptivePrompt = await this.geminiService.generateReunifyPrompt(childPhoto, adultPhoto, style);
      
      this.statusMessage.set('Step 2/2: Painting your new memory...');
      const imageData = await this.geminiService.generateImage(descriptivePrompt);

      this.generatedPhoto.set(imageData);
    } catch (error) {
      console.error(error);
      this.errorMessage.set('An error occurred while creating your image. Please try again.');
    } finally {
      this.isLoading.set(false);
      this.statusMessage.set('');
    }
  }
  
  async editImage(): Promise<void> {
    if (!this.canEdit()) return;

    const baseImage = this.generatedPhoto();
    const prompt = this.editPrompt();

    if (!baseImage || !prompt) return;
    
    this.isLoading.set(true);
    this.errorMessage.set(null);
    
    try {
      this.statusMessage.set('Step 1/2: Understanding your edit request...');
      const descriptivePrompt = await this.geminiService.generateEditPrompt(baseImage, prompt);

      this.statusMessage.set('Step 2/2: Re-imagining your photo...');
      const imageData = await this.geminiService.generateImage(descriptivePrompt);
      
      this.generatedPhoto.set(imageData);
      this.editPrompt.set('');
    } catch (error) {
      console.error(error);
      this.errorMessage.set('An error occurred while editing your image. Please try again.');
    } finally {
      this.isLoading.set(false);
      this.statusMessage.set('');
    }
  }

  updateEditPrompt(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.editPrompt.set(input.value);
  }

  triggerFileUpload(inputId: string) {
    document.getElementById(inputId)?.click();
  }
}
