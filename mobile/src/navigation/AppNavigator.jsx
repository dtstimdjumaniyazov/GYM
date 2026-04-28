import { useSelector } from 'react-redux'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import AuthNavigator from './AuthNavigator'
import MainNavigator from './MainNavigator'

const Stack = createNativeStackNavigator()

export default function AppNavigator() {
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated)

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
