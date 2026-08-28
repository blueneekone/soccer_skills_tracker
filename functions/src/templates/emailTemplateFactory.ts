import { layoutTemplate } from './layout';
import { directorWelcomeTemplate } from './director-welcome';
import { coachWelcomeTemplate } from './coach-welcome';
import { parentWelcomeTemplate } from './parent-welcome';

export function getWelcomeEmailTemplate(role: string, name: string): { subject: string, html: string } {
    let contentHtml = '';
    let subject = '';

    switch (role) {
        case 'director':
        case 'commissioner':
            contentHtml = directorWelcomeTemplate;
            subject = 'Welcome to SSTracker: Your Unified Operations Base is Ready 🚀';
            break;
        case 'coach':
            contentHtml = coachWelcomeTemplate;
            subject = 'Sideline SIEM Active: Welcome to Coach OS ⏱️';
            break;
        case 'parent':
            contentHtml = parentWelcomeTemplate;
            subject = 'Compliance Shield Active: Welcome to Parent OS 🛡️';
            break;
        default:
            return { subject: 'Welcome to SSTracker', html: '<p>Welcome!</p>' };
    }

    contentHtml = contentHtml.replace(/\{\{NAME\}\}/g, name || 'User');
    const finalHtml = layoutTemplate.replace(/\{\{CONTENT\}\}/g, contentHtml);

    return { subject, html: finalHtml };
}
