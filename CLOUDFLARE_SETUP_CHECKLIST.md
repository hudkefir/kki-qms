# Cloudflare Professional QMS Setup Checklist

## Account Setup
- [ ] Go to https://dash.cloudflare.com
- [ ] Sign in/up with business email
- [ ] Verify email address

## Domain Setup (if you own kefirkultures.com)
- [ ] Add Site → kefirkultures.com
- [ ] Change nameservers (Cloudflare provides these)
- [ ] Wait for DNS propagation (5-60 minutes)

## Zero Trust Setup  
- [ ] Go to Zero Trust dashboard
- [ ] Create new tunnel
- [ ] Name: "KKI-QMS-Production" 
- [ ] Copy tunnel token
- [ ] Configure public hostnames:
  - qms.kefirkultures.com → http://localhost:5174

## Final Steps
- [ ] Test https://qms.kefirkultures.com
- [ ] Login: admin / admin123
- [ ] Verify all features work
- [ ] Update documentation with new URL
