import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { EditorComponent } from './app/editor/editor.component';

bootstrapApplication(EditorComponent, appConfig)
  .catch((error) => {
    console.error('Avvio editor non riuscito:', error);
  });