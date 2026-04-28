import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'

import CatalogScreen from '../screens/catalog/CatalogScreen'
import CourseDetailScreen from '../screens/course/CourseDetailScreen'
import LessonsScreen from '../screens/course/LessonsScreen'
import MyCoursesScreen from '../screens/profile/MyCoursesScreen'
import FavoritesScreen from '../screens/profile/FavoritesScreen'
import ProfileScreen from '../screens/profile/ProfileScreen'
import NotificationsScreen from '../screens/notifications/NotificationsScreen'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

const COLORS = { active: '#5365CA', inactive: '#6b7280', bg: '#2a3378' }

function CatalogStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CatalogList" component={CatalogScreen} />
      <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
      <Stack.Screen name="Lessons" component={LessonsScreen} />
    </Stack.Navigator>
  )
}

function MyCoursesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyCoursesList" component={MyCoursesScreen} />
      <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
      <Stack.Screen name="Lessons" component={LessonsScreen} />
    </Stack.Navigator>
  )
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  )
}

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: COLORS.bg, borderTopColor: 'rgba(255,255,255,0.08)' },
        tabBarActiveTintColor: COLORS.active,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Catalog: focused ? 'grid' : 'grid-outline',
            MyCourses: focused ? 'book' : 'book-outline',
            Profile: focused ? 'person' : 'person-outline',
          }
          return <Ionicons name={icons[route.name]} size={size} color={color} />
        },
      })}
    >
      <Tab.Screen name="Catalog" component={CatalogStack} options={{ tabBarLabel: 'Каталог' }} />
      <Tab.Screen name="MyCourses" component={MyCoursesStack} options={{ tabBarLabel: 'Мои курсы' }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ tabBarLabel: 'Профиль' }} />
    </Tab.Navigator>
  )
}
