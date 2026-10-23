
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, X, Upload, Save, Edit, ExternalLink, MapPin, Briefcase, AtSign, Linkedin, Github, Twitter, LinkIcon } from 'lucide-react';
import { profileAPI, Profile } from '@/lib/api/profile';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { updateUserAvatar } from '@/store/slices/authSlice';
import { toast } from '@/hooks/use-toast';



export default function ProfilePage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarKey, setAvatarKey] = useState(0);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { register, handleSubmit, setValue, watch, reset } = useForm<Profile>();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const profileData = await profileAPI.getProfile();
      setProfile(profileData);
      reset(profileData);
      if (profileData?.user?.avatar) {
        setCurrentAvatarUrl(profileData.user.avatar);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: 'Error Loading Profile',
        description: 'Could not fetch your profile data. Please refresh the page.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: Profile) => {
    setSaving(true);
    try {
      const updatedProfile = await profileAPI.updateProfile(data);
      setProfile(updatedProfile);
      reset(updatedProfile);
      
      toast({
        title: 'Profile Saved!',
        description: 'Your changes have been successfully saved.',
      });
      
      setIsEditing(false);
      
      if (data.user.avatar !== user?.avatar) {
         dispatch(updateUserAvatar(data.user.avatar));
      }

    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update Failed',
        description: 'Your profile could not be saved. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { imageUrl } = await profileAPI.uploadProfileImage(file);
      
      const avatarUrl = imageUrl + '?t=' + Date.now();
      
      setCurrentAvatarUrl(avatarUrl);
      setValue('user.avatar', avatarUrl);
      dispatch(updateUserAvatar(avatarUrl));
      
      if (profile) {
        setProfile({
          ...profile,
          user: {
            ...profile.user,
            avatar: avatarUrl
          }
        });
      }
      
      setAvatarKey(prev => prev + 1);
      
      toast({
        title: 'Avatar Uploaded',
        description: 'Your new photo is ready. Click "Save Changes" to make it permanent.',
      });
      
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload Error',
        description: 'The image failed to upload. Please check the file and try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };
  
  const addSkill = () => {
    const currentSkills = watch('skills') || [];
    setValue('skills', [...currentSkills, '']);
  };

  const removeSkill = (index: number) => {
    const currentSkills = watch('skills') || [];
    setValue('skills', currentSkills.filter((_, i) => i !== index));
  };

  const addPortfolioItem = () => {
    const currentPortfolio = watch('portfolio') || [];
    setValue('portfolio', [...currentPortfolio, {
      title: '',
      description: '',
      imageUrl: '',
      projectUrl: '',
      technologies: []
    }]);
  };

  const removePortfolioItem = (index: number) => {
    const currentPortfolio = watch('portfolio') || [];
    setValue('portfolio', currentPortfolio.filter((_, i) => i !== index));
  };


  // --- Loading State ---
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="flex space-x-6 items-center">
            <div className="h-32 w-32 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-3">
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>
          <div className="mt-8 space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // --- Render Toggle ---
  return (
    <div className="max-w-4xl mx-auto p-6">
      {!isEditing ? (
        // ===============================================
        // ===       PORTFOLIO DISPLAY VIEW          ===
        // ===============================================
        <div className="space-y-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={profile?.user?.avatar || user?.avatar} alt={profile?.user?.name || user?.name} />
                  <AvatarFallback className="text-4xl">
                    {profile?.user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || user?.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="mt-4 sm:mt-0 flex-1">
                  <h1 className="text-3xl font-bold">{profile?.user?.name || user?.name}</h1>
                  {profile?.location && (
                    <div className="flex items-center text-muted-foreground mt-1">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>{profile.location.city}, {profile.location.country}</span>
                    </div>
                  )}
                  {profile?.availability && (
                     <Badge className="mt-2" variant={profile.availability === 'Available' ? 'default' : 'secondary'}>
                      {profile.availability}
                    </Badge>
                  )}
                </div>
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </div>

              {profile?.bio && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <h3 className="text-lg font-semibold">About Me</h3>
                    <p className="mt-2 text-muted-foreground whitespace-pre-line">{profile.bio}</p>
                  </div>
                </>
              )}

              <Separator className="my-6" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold">Details</h3>
                  <ul className="mt-2 space-y-2 text-muted-foreground">
                    <li className="flex items-center">
                      <AtSign className="h-4 w-4 mr-2" />
                      <span>{profile?.user?.email || user?.email}</span>
                    </li>
                    {profile?.experience && (
                      <li className="flex items-center">
                        <Briefcase className="h-4 w-4 mr-2" />
                        <span>{profile.experience} Level</span>
                      </li>
                    )}
                    {profile?.hourlyRate && (
                      <li className="flex items-center">
                        <span className="font-bold text-lg mr-2">₹{profile.hourlyRate}</span>
                        <span>/ hour</span>
                      </li>
                    )}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold">Socials</h3>
                  <ul className="mt-2 space-y-2 text-muted-foreground">
                    {profile?.socialLinks?.website && <li><a href={profile.socialLinks.website} target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-primary"><LinkIcon className="h-4 w-4 mr-2" />Website</a></li>}
                    {profile?.socialLinks?.linkedin && <li><a href={profile.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-primary"><Linkedin className="h-4 w-4 mr-2" />LinkedIn</a></li>}
                    {profile?.socialLinks?.github && <li><a href={profile.socialLinks.github} target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-primary"><Github className="h-4 w-4 mr-2" />GitHub</a></li>}
                    {profile?.socialLinks?.twitter && <li><a href={profile.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-primary"><Twitter className="h-4 w-4 mr-2" />Twitter</a></li>}
                  </ul>
                </div>
              </div>

            </CardContent>
          </Card>

          {profile?.skills && profile.skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {profile.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="text-sm py-1 px-3">
                    {skill}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}

          {profile?.portfolio && profile.portfolio.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Portfolio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {profile.portfolio.map((item, index) => (
                  <div key={index} className="flex flex-col md:flex-row gap-4 border p-4 rounded-lg">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.title} className="w-full md:w-48 h-32 object-cover rounded-md" />
                    )}
                    <div className="flex-1">
                      <h4 className="text-xl font-semibold">{item.title}</h4>
                      <p className="mt-1 text-muted-foreground">{item.description}</p>
                      {item.projectUrl && (
                        <Button asChild variant="link" className="p-0 mt-2">
                          <a href={item.projectUrl} target="_blank" rel="noopener noreferrer">
                            View Project <ExternalLink className="h-4 w-4 ml-2" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        // ===============================================
        // ===       PROFILE SETTINGS FORM           ===
        // ===============================================
        <div>
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Profile Settings</h1>
            <p className="text-muted-foreground">Manage your profile information and preferences</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <Tabs defaultValue="basic" className="space-y-6">
              <TabsList>
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="professional">Professional</TabsTrigger>
                <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
                <TabsTrigger value="social">Social Links</TabsTrigger>
              </TabsList>

              {/* --- Basic Info Tab --- */}
              <TabsContent value="basic" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center space-x-6">
                      <div className="relative">
                        {(() => {
                          const avatarUrl = currentAvatarUrl || watch('user.avatar') || profile?.user?.avatar || user?.avatar;
                          if (avatarUrl) {
                            const encodedUrl = avatarUrl.includes('?') 
                              ? avatarUrl.split('?')[0] + '?t=' + encodeURIComponent(avatarUrl.split('?')[1] || Date.now())
                              : avatarUrl;
                            
                            return (
                              <div className="h-32 w-32 rounded-full overflow-hidden border-2 border-border">
                                <img 
                                  key={`avatar-${avatarKey}-${avatarUrl}`}
                                  src={encodedUrl} 
                                  alt={user?.name || 'Profile'}
                                  className="w-full h-full object-cover"
                                  crossOrigin="anonymous"
                                  onError={(e) => {
                                    console.error('Image failed to load:', encodedUrl);
                                    const baseUrl = encodedUrl.split('?')[0];
                                    if (e.currentTarget.src !== baseUrl) {
                                      e.currentTarget.src = baseUrl;
                                    } else {
                                      e.currentTarget.style.display = 'none';
                                    }
                                  }}
                                />
                              </div>
                            );
                          }
                          return (
                            <Avatar className="h-32 w-32">
                              <AvatarFallback className="text-2xl">
                                {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          );
                        })()}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          disabled={uploading}
                        />
                        {uploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                          </div>
                        )}
                      </div>
                      <div>
                        <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                           <Label className="cursor-pointer">
                              <Upload className="h-4 w-4 mr-2" />
                              {uploading ? 'Uploading...' : 'Change Photo'}
                           </Label>
                        </Button>
                        <p className="text-sm text-muted-foreground mt-2">
                          Click on the avatar or button to upload
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          {...register('user.name')}
                          defaultValue={profile?.user.name}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          {...register('user.email')}
                          defaultValue={profile?.user.email}
                          disabled
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        {...register('bio')}
                        placeholder="Tell us about yourself..."
                        rows={4}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          {...register('location.city')}
                          placeholder="Your city"
                        />
                      </div>
                      <div>
                        <Label htmlFor="country">Country</Label>
                        <Input
                          id="country"
                          {...register('location.country')}
                          placeholder="Your country"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* --- Professional Tab --- */}
              <TabsContent value="professional" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Professional Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="experience">Experience Level</Label>
                        <Select
                          value={watch('experience')}
                          onValueChange={(value) => setValue('experience', value as any)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select experience level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Entry">Entry Level</SelectItem>
                            <SelectItem value="Intermediate">Intermediate</SelectItem>
                            <SelectItem value="Expert">Expert</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="hourlyRate">Hourly Rate (₹)</Label>
                        <Input
                          id="hourlyRate"
                          type="number"
                          {...register('hourlyRate', { valueAsNumber: true })}
                          placeholder="500"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="availability">Availability</Label>
                      <Select
                        value={watch('availability')}
                        onValueChange={(value) => setValue('availability', value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select availability" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Available">Available</SelectItem>
                          <SelectItem value="Busy">Busy</SelectItem>
                          <SelectItem value="Unavailable">Unavailable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Skills</Label>
                      <div className="space-y-2">
                        {(watch('skills') || []).map((skill, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <Input
                              {...register(`skills.${index}`)}
                              placeholder="Enter skill"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeSkill(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addSkill}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Skill
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* --- Portfolio Tab --- */}
              <TabsContent value="portfolio" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Portfolio</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {(watch('portfolio') || []).map((item, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">Portfolio Item {index + 1}</h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removePortfolioItem(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`portfolio.${index}.title`}>Title</Label>
                            <Input
                              {...register(`portfolio.${index}.title`)}
                              placeholder="Project title"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`portfolio.${index}.projectUrl`}>Project URL</Label>
                            <Input
                              {...register(`portfolio.${index}.projectUrl`)}
                              placeholder="https://example.com"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor={`portfolio.${index}.description`}>Description</Label>
                          <Textarea
                            {...register(`portfolio.${index}.description`)}
                            placeholder="Describe your project..."
                            rows={3}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`portfolio.${index}.imageUrl`}>Image URL</Label>
                          <Input
                            {...register(`portfolio.${index}.imageUrl`)}
                            placeholder="https://example.com/image.jpg"
                          />
                        </div>
                      </div>
                    ))}
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addPortfolioItem}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Portfolio Item
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* --- Social Links Tab --- */}
              <TabsContent value="social" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Social Links</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        {...register('socialLinks.website')}
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="linkedin">LinkedIn</Label>
                      <Input
                        id="linkedin"
                        {...register('socialLinks.linkedin')}
                        placeholder="https://linkedin.com/in/yourprofile"
                      />
                    </div>
                    <div>
                      <Label htmlFor="github">GitHub</Label>
                      <Input
                        id="github"
                        {...register('socialLinks.github')}
                        placeholder="https://github.com/yourusername"
                      />
                    </div>
                    <div>
                      <Label htmlFor="twitter">Twitter</Label>
                      <Input
                        id="twitter"
                        {...register('socialLinks.twitter')}
                        placeholder="https://twitter.com/yourusername"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* --- Buttons --- */}
            <div className="flex justify-end mt-6 space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}



