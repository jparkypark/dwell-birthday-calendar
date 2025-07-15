# Admin Guide - Dwell Birthday Calendar

## Overview

The Dwell Birthday Calendar admin interface provides a simple, secure way to manage birthday data for your church community. This guide covers all administrative functions and best practices.

## Getting Started

### Accessing the Admin Panel

1. Navigate to `/admin` on your deployed worker (e.g., `https://birthday.angiesplantdiary.com/admin`)
2. Enter your admin credentials:
   - **Username**: `admin`
   - **Password**: The password configured in your `ADMIN_PASSWORD` environment variable

### First Time Setup

After successful authentication, you'll see the admin dashboard with:
- Current birthday data in JSON format
- Cache status information
- JSON editor for making changes
- Validation and formatting tools

## Managing Birthday Data

### Data Structure

Birthday data is stored in JSON format with the following structure:

```json
{
  "birthdays": [
    {
      "name": "John Doe",
      "month": 1,
      "day": 15,
      "slackUserId": "U1234567890"
    },
    {
      "name": "Jane Smith",
      "month": 2,
      "day": 20
    }
  ]
}
```

### Field Descriptions

- **name** (required): Person's full name as it should appear in notifications
- **month** (required): Month as number (1-12, where 1 = January)
- **day** (required): Day of month (1-31, validated per month)
- **slackUserId** (optional): Slack user ID for @mentions in notifications

### Adding New Birthdays

1. Locate the `"birthdays"` array in the JSON editor
2. Add a new object with the required fields:
   ```json
   {
     "name": "New Person",
     "month": 3,
     "day": 25,
     "slackUserId": "U9876543210"
   }
   ```
3. Click "Validate JSON" to check for errors
4. Click "Update Birthday Data" to save changes

### Editing Existing Birthdays

1. Find the person's entry in the JSON
2. Modify the desired fields
3. Validate and save your changes

### Removing Birthdays

1. Delete the entire JSON object for the person
2. Ensure proper JSON syntax (remove trailing commas)
3. Validate and save

## JSON Editor Features

### Validation Tools

- **Validate JSON**: Checks for syntax errors and data structure
- **Format JSON**: Automatically formats and indents the JSON
- **Real-time validation**: Live feedback as you type

### Error Handling

The editor will show specific error messages for:
- Invalid JSON syntax
- Missing required fields
- Invalid dates (e.g., February 30th)
- Duplicate names
- Data limit violations

### Best Practices

1. **Always validate** before saving
2. **Use proper names** as they appear in notifications
3. **Include Slack IDs** when possible for better integration
4. **Backup data** before major changes
5. **Test with small changes** first

## Cache Management

### Understanding Cache Status

The admin panel displays:
- **Last Updated**: When the cache was last refreshed
- **Total Birthdays**: Current count of birthday entries
- **Cache Status**: Whether cache is fresh or expired

### Cache Behavior

- Cache automatically refreshes after data updates
- Scheduled cache warming occurs during business hours
- Cache expires after 1 hour of inactivity

### Manual Cache Refresh

Cache is automatically cleared when you update birthday data. No manual intervention needed.

## Data Validation Rules

### Name Validation

- **Required**: Cannot be empty
- **Length**: Maximum 100 characters
- **Security**: XSS and injection attempts are blocked
- **Duplicates**: Names must be unique (case-insensitive)

### Date Validation

- **Month**: Must be 1-12
- **Day**: Must be valid for the given month
- **Leap Year**: February 29th is accepted and handled automatically
- **Invalid Dates**: February 30th, April 31st, etc. are rejected

### Slack User ID Validation

- **Format**: Must start with 'U' followed by 9+ alphanumeric characters
- **Optional**: Can be omitted if person is not in Slack
- **Case Sensitive**: Must match exact Slack ID format

## Security Features

### Authentication

- **HTTP Basic Auth**: Username/password protection
- **HTTPS Only**: All traffic encrypted
- **Session Management**: Stateless authentication

### Data Protection

- **Input Validation**: All data is validated and sanitized
- **XSS Prevention**: Malicious scripts are blocked
- **Injection Protection**: SQL injection attempts are prevented
- **Audit Logging**: All admin actions are logged

### Best Practices

1. **Use strong passwords** for admin access
2. **Access from secure networks** only
3. **Log out when finished** (close browser)
4. **Regular password rotation** recommended
5. **Monitor access logs** for suspicious activity

## Troubleshooting

### Common Issues

#### "Invalid JSON" Error
- **Cause**: Malformed JSON syntax
- **Solution**: Use "Format JSON" button or check for missing commas, brackets

#### "Validation Failed" Error
- **Cause**: Invalid data values
- **Solution**: Check month/day values, name requirements, duplicate names

#### "Authentication Required" Error
- **Cause**: Session expired or invalid credentials
- **Solution**: Refresh page and re-enter credentials

#### "Cache Not Refreshing" Issue
- **Cause**: May be normal delay
- **Solution**: Wait 1-2 minutes, cache refreshes automatically

### Getting Help

If you encounter issues:

1. **Check the error message** - it usually explains the problem
2. **Validate your JSON** using the built-in validator
3. **Review this guide** for data format requirements
4. **Contact technical support** if problems persist

## Data Backup and Recovery

### Manual Backup

1. Copy the JSON from the admin panel
2. Save to a secure location
3. Include timestamp in filename

### Recovery Process

1. Access admin panel
2. Paste backup JSON into editor
3. Validate and save

### Automated Backups

- Data is automatically backed up in Cloudflare KV
- No manual backup schedule needed
- Data persists across deployments

## Performance Considerations

### Data Limits

- **Maximum birthdays**: 1,000 entries
- **Name length**: 100 characters maximum
- **Response time**: Updates complete within 2-3 seconds

### Optimization Tips

1. **Keep names concise** but descriptive
2. **Remove inactive members** periodically
3. **Use Slack IDs** for better performance
4. **Validate before saving** to avoid errors

## Mobile Access

The admin interface is fully responsive and works on:
- **Smartphones**: iOS and Android
- **Tablets**: iPad and Android tablets
- **Desktop**: All modern browsers

### Mobile Tips

1. **Use landscape mode** for easier editing
2. **Zoom in** if needed for precise editing
3. **Validate frequently** on mobile
4. **Use external keyboard** for extensive editing

## Regular Maintenance

### Monthly Tasks

1. **Review birthday list** for accuracy
2. **Remove inactive members** if needed
3. **Update Slack IDs** for new members
4. **Check cache performance** in admin panel

### Quarterly Tasks

1. **Review access logs** for security
2. **Update admin password** if needed
3. **Backup current data** manually
4. **Test all admin functions** after updates

## Security Checklist

- [ ] Admin password is strong and unique
- [ ] Access is from secure networks only
- [ ] Regular password rotation schedule
- [ ] Monitoring of admin access logs
- [ ] Backup procedures are tested
- [ ] All team members know admin procedures

## Support

For technical support or questions about the admin interface:

1. **Check this guide** first
2. **Review error messages** carefully
3. **Test with minimal changes** to isolate issues
4. **Contact your technical administrator** for deployment issues

---

*This guide covers the Dwell Birthday Calendar admin interface. For user-facing features, see the [User Guide](USER_GUIDE.md).*