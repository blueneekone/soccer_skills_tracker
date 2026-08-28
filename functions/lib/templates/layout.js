"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.layoutTemplate = void 0;
exports.layoutTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            background-color: #000000;
            color: #ffffff;
            font-family: monospace;
            margin: 0;
            padding: 20px;
        }
        .container {
            border: 1px solid #334155;
            padding: 20px;
            max-width: 600px;
            margin: 0 auto;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #14b8a6; /* Data Cyan */
            font-family: monospace;
        }
        .highlight-magenta {
            color: #ff007f; /* Cyber Magenta */
        }
        .highlight-gold {
            color: #fbbf24; /* Action Gold */
        }
        .btn {
            background-color: #ff007f; /* Cyber Magenta */
            color: #ffffff;
            padding: 10px 20px;
            text-decoration: none;
            display: inline-block;
            border: 1px solid #fbbf24; /* Action Gold highlight border */
        }
        .btn-gold {
            background-color: #fbbf24; /* Action Gold */
            color: #000000;
            padding: 10px 20px;
            text-decoration: none;
            display: inline-block;
            border: 1px solid #ff007f; /* Cyber Magenta highlight border */
        }
    </style>
</head>
<body>
    <div class="container">
        {{CONTENT}}
    </div>
</body>
</html>
`;
