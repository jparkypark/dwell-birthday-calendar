import { BaseHandler } from './base-handler';
import { HandlerContext, StandardResponse } from '../utils/handler-utils';
import { createStorageService } from '../utils/storage';
import { AppError } from '../middleware/error-handler';

export class AdminHandler extends BaseHandler {
  constructor() {
    super({
      requireSignatureVerification: false // Admin routes don't need Slack verification
    });
  }

  async handle(context: HandlerContext): Promise<StandardResponse> {
    const { env, logger, request } = context;
    
    logger.info('Admin panel accessed');

    try {
      const storageService = createStorageService(env, request);
      
      // Get current birthday data
      const birthdayData = await storageService.getBirthdayData();
      
      // Get cache status
      const cacheStatus = await storageService.getCacheStatus();
      
      // Format JSON for display
      const formattedJson = JSON.stringify(birthdayData, null, 2);
      
      const html = this.generateAdminHTML(formattedJson, cacheStatus);
      
      return {
        body: html,
        status: 200,
        headers: {
          'Content-Type': 'text/html'
        }
      };
    } catch (error) {
      logger.error('Failed to load admin panel', { error });
      throw new AppError('Failed to load admin panel', 500);
    }
  }

  private generateAdminHTML(jsonData: string, cacheStatus: { lastUpdated: number | null; isExpired: boolean }): string {
    const lastUpdated = cacheStatus?.lastUpdated 
      ? new Date(cacheStatus.lastUpdated).toLocaleString()
      : 'Never';
      
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Birthday Calendar Admin</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            * {
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 20px;
              background-color: #f5f5f5;
              color: #333;
            }
            
            .container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              border-radius: 8px;
              padding: 30px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            h1 {
              color: #2eb886;
              margin-top: 0;
              text-align: center;
            }
            
            .status-info {
              background: #f8f9fa;
              border-left: 4px solid #2eb886;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            
            .status-info h3 {
              margin: 0 0 10px 0;
              color: #2eb886;
            }
            
            .form-group {
              margin-bottom: 20px;
            }
            
            label {
              display: block;
              margin-bottom: 8px;
              font-weight: 600;
              color: #555;
            }
            
            #jsonEditor {
              width: 100%;
              min-height: 400px;
              padding: 15px;
              font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
              font-size: 14px;
              border: 2px solid #ddd;
              border-radius: 4px;
              background: #f8f9fa;
              resize: vertical;
            }
            
            #jsonEditor:focus {
              outline: none;
              border-color: #2eb886;
              background: white;
            }
            
            .button-group {
              display: flex;
              gap: 10px;
              margin-top: 20px;
            }
            
            button {
              padding: 12px 24px;
              border: none;
              border-radius: 4px;
              font-size: 16px;
              cursor: pointer;
              font-weight: 600;
              transition: background-color 0.2s;
            }
            
            .btn-primary {
              background: #2eb886;
              color: white;
            }
            
            .btn-primary:hover {
              background: #1e7e34;
            }
            
            .btn-secondary {
              background: #6c757d;
              color: white;
            }
            
            .btn-secondary:hover {
              background: #5a6268;
            }
            
            .error {
              color: #dc3545;
              background: #f8d7da;
              border: 1px solid #f5c6cb;
              padding: 12px;
              border-radius: 4px;
              margin: 20px 0;
            }
            
            .success {
              color: #155724;
              background: #d4edda;
              border: 1px solid #c3e6cb;
              padding: 12px;
              border-radius: 4px;
              margin: 20px 0;
            }
            
            .json-status {
              font-size: 14px;
              margin-top: 10px;
              padding: 8px;
              border-radius: 4px;
              background: #e9ecef;
            }
            
            .json-valid {
              background: #d4edda;
              color: #155724;
            }
            
            .json-invalid {
              background: #f8d7da;
              color: #721c24;
            }
            
            @media (max-width: 768px) {
              body {
                padding: 10px;
              }
              
              .container {
                padding: 20px;
              }
              
              .button-group {
                flex-direction: column;
              }
              
              button {
                width: 100%;
              }
              
              #jsonEditor {
                min-height: 300px;
                font-size: 12px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎂 Birthday Calendar Admin</h1>
            
            <div class="status-info">
              <h3>Cache Status</h3>
              <p><strong>Last Updated:</strong> ${lastUpdated}</p>
              <p><strong>Total Birthdays:</strong> ${JSON.parse(jsonData).birthdays.length}</p>
            </div>
            
            <form method="POST" action="/admin/update">
              <div class="form-group">
                <label for="jsonEditor">Birthday Data (JSON Format):</label>
                <textarea 
                  name="birthdayData" 
                  id="jsonEditor" 
                  required
                >${jsonData}</textarea>
                <div id="jsonStatus" class="json-status">JSON is valid</div>
              </div>
              
              <div class="button-group">
                <button type="submit" class="btn-primary">Update Birthday Data</button>
                <button type="button" class="btn-secondary" onclick="validateJSON()">Validate JSON</button>
                <button type="button" class="btn-secondary" onclick="formatJSON()">Format JSON</button>
              </div>
            </form>
          </div>
          
          <script>
            function validateJSON() {
              const editor = document.getElementById('jsonEditor');
              const status = document.getElementById('jsonStatus');
              
              try {
                JSON.parse(editor.value);
                status.textContent = 'JSON is valid ✓';
                status.className = 'json-status json-valid';
              } catch (error) {
                status.textContent = 'JSON is invalid: ' + error.message;
                status.className = 'json-status json-invalid';
              }
            }
            
            function formatJSON() {
              const editor = document.getElementById('jsonEditor');
              
              try {
                const parsed = JSON.parse(editor.value);
                editor.value = JSON.stringify(parsed, null, 2);
                validateJSON();
              } catch (error) {
                alert('Cannot format invalid JSON: ' + error.message);
              }
            }
            
            // Real-time validation
            document.getElementById('jsonEditor').addEventListener('input', function() {
              setTimeout(validateJSON, 500);
            });
          </script>
        </body>
      </html>
    `;
  }
}